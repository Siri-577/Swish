import { DEFAULT_SHOT_PROFILE } from '../config/shot-profile-config.js'
import { SHOT_TIMING_CONFIG } from '../config/shot-timing-config.js'
import { GameClock } from '../core/GameClock.js'
import { InputTiming } from '../core/InputTiming.js'
import { ShotInputController } from '../input/ShotInputController.js'
import { getShotMeterTimeline, SHOT_METER_PHASE } from './ShotMeterTimeline.js'
import { resolveShotMeterRelease, shouldIgnoreKeyboardRelease } from './ShotMeterRelease.js'
import { getGreenWindow } from './GreenWindow.js'
import { createLockedShotProfile } from './GreenWindowCalculator.js'
import { createShotContext } from './ShotContext.js'
import { ShotMeterOverlay } from '../ui/ShotMeterOverlay.js'
import { ShotOutcomeSystem } from './ShotOutcomeSystem.js'
import { createShotResultRecord, recordRimContact } from './ShotResultRecord.js'
import { PhysicsMotionType, PhysicsPrestepType, Quaternion, Vector3 } from '@babylonjs/core'
import { applyShotVariation, createBaseShotSolution } from './BaseShotSolution.js'
import { canSyncHeldBall } from './BallControlPolicy.js'
import {
  HOOP_ENTRY_HEIGHT_METERS,
  applyNetDampingVelocity,
  getNetExitPlaneY,
  getSafeEntryRadius,
} from './NetCapture.js'
import { createShotTimeCompression } from './ShotTimeCompression.js'
import { getSweptPlaneCrossing } from './RimPlaneCrossing.js'
import { predictRimPlaneCrossing } from './RimCrossingPrediction.js'

const RESULT_DISPLAY_MS = 450
const DEBUG_SHOT_PHYSICS = true

export function isFiniteVector(vector) {
  return Boolean(vector)
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z)
}

export function toPlainVector(vector) {
  if (!isFiniteVector(vector)) return null
  return { x: vector.x, y: vector.y, z: vector.z }
}

export function formatVector(vector) {
  if (!isFiniteVector(vector)) return '--'
  return `(${vector.x.toFixed(3)}, ${vector.y.toFixed(3)}, ${vector.z.toFixed(3)})`
}

export function vectorLength(vector) {
  return isFiniteVector(vector) ? Math.hypot(vector.x, vector.y, vector.z) : null
}

function formatNumber(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '--'
}

export class ShotFlightController3D {
  constructor({ ball, hoop, spot, engine, scene, player, physics, shootingProfile, profile = DEFAULT_SHOT_PROFILE }) {
    this.ball = ball
    this.hoop = hoop
    this.spot = spot
    this.profile = profile
    this.shootingProfile = shootingProfile
    this.physics = physics
    this.ballBody = physics.ballBody
    this.defaultBallLinearDamping = physics.ballLinearDamping ?? 0.045
    this.scene = scene
    this.activeShotProfile = null
    this.activeShotContext = null
    this.inputTiming = new InputTiming()
    this.state = 'READY'
    this.flightStartTime = 0
    this.flightDurationMs = 0
    this.currentFlightElapsedMs = 0
    this.resultEndTime = 0
    this.initialRotation = 0
    this.position = { x: 0, y: 0, z: 0 }
    this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
    this.lastUiUpdate = 0
    this.timingResult = null
    this.outcome = null
    this.shotResult = null
    this.physicsFlight = false
    this.shotHasScored = false
    this.madeAt = 0
    this.postShotStartedAt = 0
    this.hasHitFloor = false
    this.floorContactAt = 0
    this.makeDebugStage = 0
    this.lastRimContactAt = -Infinity
    this.shotIdCounter = 0
    this.previousBallPosition = { x: 0, y: 0, z: 0 }
    this.expectedLaunchVelocity = null
    this.launchDebugFrame = 0
    this.launchTravelDebugStage = 0
    this.shotTrajectoryActive = false
    this.shotCompression = null
    this.extraGravityForce = new Vector3(0, 0, 0)
    this.netCaptureVelocity = new Vector3(0, 0, 0)
    this.netCaptureStartedAt = 0
    this.netCaptureEntryVelocity = null
    this.netCaptureExitVelocity = null
    this.captureType = null
    this.captureDebugStage = 0
    this.debugTrajectoryPoints = []
    this.previousPhysicsPosition = new Vector3(0, 0, 0)
    this.hasPhysicsPositionSample = false
    this.latestSwishPrediction = null
    this.launchPosition = { x: 0, y: 0, z: 0 }
    this.greenFlightFrame = 0
    this.meter = new ShotMeterOverlay({ engine, scene, player, profile })
    this.shotInput = new ShotInputController({
      inputTiming: this.inputTiming,
      canPress: () => this.state === 'READY',
      onPress: () => {
        this.lockShotParameters()
        this.state = 'HOLDING'
      },
      onRelease: (duration) => this.launch(duration),
      onCancel: () => this.finishCancel(),
    })
    this.overlay = document.createElement('aside')
    this.overlay.className = 'shot-debug-overlay'
    document.body.append(this.overlay)
    this.ballBody.getCollisionObservable().add((event) => this.handlePhysicsCollision(event))
    this.beforePhysicsObserver = this.scene.onBeforePhysicsObservable.add(() => this.updateShotPhysics())
    this.resetBall()
    this.refreshUi(GameClock.now())
  }

  getReleasePosition() {
    const { playerPosition, ballOffset } = this.spot
    const profile = this.activeShotProfile ?? this.profile
    return {
      x: playerPosition.x + ballOffset.x,
      y: Number.isFinite(profile.releaseHeight)
        ? profile.releaseHeight
        : playerPosition.y + ballOffset.y + profile.releaseHeightOffset,
      z: playerPosition.z + ballOffset.z,
    }
  }

  handleKeyDown(event) {
    if (DEBUG_SHOT_PHYSICS && event.code === 'KeyP') {
      event.preventDefault()
      this.debugLaunchProbe()
      return
    }
    if (DEBUG_SHOT_PHYSICS && event.code === 'KeyC') {
      event.preventDefault()
      this.debugCenterSwishTest()
      return
    }
    if (event.code !== 'Space') return
    event.preventDefault()
    if (this.beginInput('KEYBOARD')) this.refreshUi(GameClock.now())
  }

  handleKeyUp(event) {
    if (event.code !== 'Space' || shouldIgnoreKeyboardRelease(this.state)) return
    event.preventDefault()
    this.releaseInput('KEYBOARD')
  }

  cancel() {
    this.shotInput.cancel()
  }

  beginInput(source, pointerId = null) {
    return this.shotInput.press(source, pointerId)
  }

  releaseInput(source, pointerId = null) {
    return this.shotInput.release(source, pointerId)
  }

  cancelInput(source = null, pointerId = null) {
    return this.shotInput.cancel(source, pointerId)
  }

  finishCancel() {
    this.state = 'READY'
    this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
    this.clearActiveShotParameters()
    this.refreshUi(GameClock.now())
  }

  launch(heldDuration, forced = false) {
    const profile = this.activeShotProfile ?? this.profile
    this.meterTimeline = getShotMeterTimeline(heldDuration, profile)
    this.timingResult = resolveShotMeterRelease({ heldDuration, profile, windows: SHOT_TIMING_CONFIG.windows, forced })
    const startPosition = this.getReleasePosition()
    const baseShotSolution = createBaseShotSolution({
      releasePosition: startPosition,
      rimCenter: this.hoop.rimCenter,
      gravity: this.physics.gravity,
      launchAngleDegrees: profile.baseLaunchAngleDegrees,
      gameplayFlightTimeScale: profile.gameplayFlightTimeScale,
    })
    const greenWindow = getGreenWindow(profile)
    const shotOutcome = ShotOutcomeSystem.resolve({
      timingResult: this.timingResult,
      greenWindow,
      rimCenter: this.hoop.rimCenter,
      shotContext: this.activeShotContext,
      shootingProfile: this.shootingProfile,
      shotDirection: { x: this.hoop.rimCenter.x - startPosition.x, z: this.hoop.rimCenter.z - startPosition.z },
    })
    this.shotResult = createShotResultRecord(shotOutcome)
    this.shotResult.shotId = ++this.shotIdCounter
    this.shotResult.timingGrade = this.timingResult.result
    // Timing predicts the quality of release; it never declares a physical
    // make. A make exists only after the ball exits the net zone.
    this.outcome = this.timingResult.isGreen ? 'GREEN' : 'MISS TIMING'
    this.physicsFlight = true
    this.shotHasScored = false
    this.hasHitFloor = false
    this.floorContactAt = 0
    this.makeDebugStage = 0
    this.madeAt = 0
    this.postShotStartedAt = 0
    this.previousBallPosition = { ...startPosition }
    this.launchPosition = { ...startPosition }
    this.launchTravelDebugStage = 0
    // Leaving HOLDING is deliberately the first state transition of release.
    // No held-ball synchronization may run after this line.
    this.state = 'BALL_IN_FLIGHT'

    let finalSolution
    if (this.timingResult.isGreen) {
      this.flightDurationMs = baseShotSolution.baseFlightDurationMs
      this.shotResult.targetPosition = toPlainVector(this.hoop.rimCenter)
      this.shotResult.launchVelocity = toPlainVector(baseShotSolution.baseLaunchVelocity)
      this.shotResult.flightDurationMs = this.flightDurationMs
      this.shotResult.apexHeight = baseShotSolution.baseApexHeight
      this.shotResult.rimArrivalVelocity = toPlainVector(baseShotSolution.baseRimArrivalVelocity)
      this.shotResult.launchAngleDegrees = baseShotSolution.baseLaunchAngleDegrees
      this.shotResult.entryAngleDegrees = baseShotSolution.baseEntryAngleDegrees
      this.shotResult.shotDistanceMeters = baseShotSolution.horizontalDistance
      this.shotResult.releaseHeight = startPosition.y
      finalSolution = baseShotSolution
    } else {
      finalSolution = this.createPhysicalMissSolution(shotOutcome, baseShotSolution)
    }
    // Green and miss shots deliberately share one physics-only release path.
    this.launchPhysicsBall(finalSolution, profile)
    if (DEBUG_SHOT_PHYSICS) this.logShotSolution()
    this.flightStartTime = GameClock.now()
    this.greenFlightFrame = 0
    if (DEBUG_SHOT_PHYSICS && this.timingResult.isGreen) {
      console.debug('=== GREEN FLIGHT Frame 0 ===', this.getMotionDebugSnapshot())
    }
    this.initialRotation = this.ball.rotation.y
    this.refreshUi(this.flightStartTime)
  }

  debugLaunchProbe() {
    if (this.state !== 'READY') return false
    const startPosition = this.getReleasePosition()
    const profile = this.profile
    this.shotResult = createShotResultRecord({ timingError: 0, horizontalError: 0, depthError: 0, arcError: 0, isGreen: false, targetPosition: null })
    this.shotResult.shotId = ++this.shotIdCounter
    this.shotResult.timingGrade = 'DEBUG_PROBE'
    this.shotResult.launchVelocity = { x: 0, y: 5, z: 8 }
    this.shotResult.flightDurationMs = 0
    this.outcome = 'DEBUG_PROBE'
    this.physicsFlight = true
    this.shotHasScored = false
    this.hasHitFloor = false
    this.floorContactAt = 0
    this.previousBallPosition = { ...startPosition }
    this.launchPosition = { ...startPosition }
    this.launchTravelDebugStage = 0
    this.state = 'BALL_IN_FLIGHT'
    this.flightStartTime = GameClock.now()
    this.launchPhysicsBall({ launchVelocity: this.shotResult.launchVelocity, skipShotTimeCompression: true }, profile)
    return true
  }

  debugCenterSwishTest() {
    if (this.state !== 'READY') return false
    this.lockShotParameters()
    const profile = this.activeShotProfile ?? this.profile
    this.launch(profile.targetReleaseMs)
    if (DEBUG_SHOT_PHYSICS) console.debug('=== CENTER SWISH TEST ===', { target: toPlainVector(this.hoop.rimCenter) })
    return true
  }

  update(now = GameClock.now()) {
    if (canSyncHeldBall(this.state)) this.syncHeldBallToReleasePosition()

    if (this.state === 'HOLDING') {
      const heldDuration = this.inputTiming.getHeldDuration()
      this.meterTimeline = getShotMeterTimeline(heldDuration, this.activeShotProfile ?? this.profile)
      if (this.meterTimeline.shouldForceRelease) {
        const forcedDuration = this.inputTiming.release()
        if (forcedDuration !== null) {
          this.shotInput.clearActiveInput()
          this.launch(forcedDuration, true)
        }
      } else if (now - this.lastUiUpdate >= 100) {
        this.refreshUi(now)
      }
    }

    if (this.state === 'BALL_IN_FLIGHT' || this.state === 'NET_CAPTURE' || this.state === 'POST_SHOT') {
      const profile = this.activeShotProfile ?? this.profile
      const elapsed = now - this.flightStartTime
      this.currentFlightElapsedMs = elapsed
      this.updatePhysicalFlight(elapsed, now)
      this.logLaunchReadback()
      this.logLaunchTravelDistance(elapsed)
      this.logGreenFlightTrace()
      this.logNetCaptureTrace(now)
      this.logMakeMotion(now)
      if (now - this.lastUiUpdate >= 100) this.refreshUi(now)
      if (this.physicsFlight && this.shouldCompletePhysicalFlight(elapsed, now)) {
        this.enterResult(now)
      }
    } else if (this.state === 'RESULT' && now >= this.resultEndTime) {
      this.state = 'RESETTING'
      this.resetBall()
      this.state = 'READY'
      this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
      this.clearActiveShotParameters()
      this.refreshUi(now)
    }

    if (this.state === 'NET_CAPTURE') {
      this.hoop.netVisual?.updateBallInteraction(this.ball.position, this.ballBody.getLinearVelocity(), this.physics.ballRadius)
    } else {
      this.hoop.netVisual?.stopBallInteraction()
    }
    this.hoop.netVisual?.update(this.scene.getEngine().getDeltaTime() / 1000)

    this.meter.update({
      state: this.state,
      timeline: this.meterTimeline,
      timingResult: this.timingResult,
    })
  }

  resetBall() {
    this.restoreBallLinearDamping()
    this.teleportBallToReleasePosition()
    this.physicsFlight = false
    this.shotHasScored = false
    this.hasHitFloor = false
    this.floorContactAt = 0
    this.makeDebugStage = 0
    this.madeAt = 0
    this.postShotStartedAt = 0
    this.flightDurationMs = 0
    this.currentFlightElapsedMs = 0
    this.expectedLaunchVelocity = null
    this.launchDebugFrame = 0
    this.launchTravelDebugStage = 0
    this.greenFlightFrame = 0
    this.shotTrajectoryActive = false
    this.shotCompression = null
    this.netCaptureStartedAt = 0
    this.netCaptureEntryVelocity = null
    this.netCaptureExitVelocity = null
    this.captureType = null
    this.captureDebugStage = 0
    this.debugTrajectoryPoints.length = 0
    this.hasPhysicsPositionSample = false
    this.latestSwishPrediction = null
    this.physics.ballShape.filterCollideMask = this.physics.collision.WORLD | this.physics.collision.RIM
    this.timingResult = null
    this.outcome = null
    this.shotResult = null
  }

  syncHeldBallToReleasePosition() {
    if (!canSyncHeldBall(this.state)) return
    this.teleportBallToReleasePosition()
  }

  teleportBallToReleasePosition() {
    const start = this.getReleasePosition()
    this.ball.position.copyFromFloats(start.x, start.y, start.z)
    this.ball.rotation.set(0, 0, 0)
    this.ball.computeWorldMatrix(true)
    this.ballBody.setPrestepType(PhysicsPrestepType.TELEPORT)
    this.ballBody.setTargetTransform(new Vector3(start.x, start.y, start.z), Quaternion.Identity())
    this.ballBody.setLinearVelocity(Vector3.Zero())
    this.ballBody.setAngularVelocity(Vector3.Zero())
  }

  lockShotParameters() {
    this.activeShotContext = createShotContext({ playerPosition: this.spot.playerPosition, rimPosition: this.hoop.rimCenter })
    this.activeShotProfile = createLockedShotProfile({ shotProfile: this.profile, shootingProfile: this.shootingProfile, shotContext: this.activeShotContext })
    this.meter.setProfile(this.activeShotProfile)
  }

  clearActiveShotParameters() {
    this.activeShotProfile = null
    this.activeShotContext = null
    this.meter.setProfile(this.profile)
  }

  refreshUi(now) {
    this.lastUiUpdate = now
    const holding = this.state === 'HOLDING' ? `Holding: ${formatNumber(this.inputTiming.getHeldDuration(), 1)} ms\n` : ''
    const physicalResult = this.shotResult
      ? (this.shotResult.made ? this.shotResult.finalResult : 'PENDING')
      : '--'
    const result = this.timingResult
      ? `Timing: ${this.timingResult.result ?? '--'}\nRelease: ${formatNumber(this.timingResult.heldDuration, 1)} ms\nError: ${formatNumber(this.timingResult.errorMs, 1)} ms\nExpected Outcome: ${this.outcome ?? '--'}\nPhysical Result: ${physicalResult}`
      : 'Timing: --\nRelease: --\nError: --\nExpected Outcome: --\nPhysical Result: --'
    const greenWindow = getGreenWindow(this.activeShotProfile ?? this.profile)
    const phase = this.meterTimeline.phase
    const visualProgress = formatNumber(this.meterTimeline.progress * 100, 1)
    const source = this.shotInput.activeInputSource ?? '-'
    const pointer = this.shotInput.activePointerId ?? '-'
    const entryAngle = this.shotResult ? `\nEntry Angle: ${formatNumber(this.shotResult.entryAngleDegrees, 2)} deg` : ''
    const compression = this.shotResult?.shotTimeCompression
      ? `\nTime Compression: ${formatNumber(this.shotResult.shotTimeCompression, 2)}\nVelocity Scale: ${formatNumber(1 / this.shotResult.shotTimeCompression, 3)}\nEffective Shot Gravity: ${formatNumber(this.shotResult.effectiveShotGravity, 2)} m/s²\nActual Rim Arrival: ${formatNumber(this.shotResult.actualRimArrivalMs, 1)} ms`
      : ''
    const safeEntryRadius = this.getSafeEntryRadius()
    const prediction = this.latestSwishPrediction ?? this.shotResult?.swishPrediction
    const netCapture = this.shotResult
      ? `\nSwish Prediction Armed: ${prediction ? 'YES' : 'NO'}\nBall Height Above Rim: ${formatNumber(this.ball.position.y - this.hoop.rimCenter.y)} m\nPredicted Time To Rim: ${formatNumber(prediction?.timeSeconds)} s\nPredicted Rim Position: ${this.formatVector(prediction?.position)}\nPredicted Rim Distance: ${formatNumber(prediction?.horizontalDistance)} m\nSwish Committed: ${this.shotResult.hoopEntry ? 'YES' : 'NO'}\nHoop Exit: ${this.shotResult.hoopExit ? 'YES' : 'NO'}\nCross Distance: ${formatNumber(this.shotResult.crossDistance)} m\nPass Radius: ${formatNumber(this.shotResult.passRadius ?? safeEntryRadius)} m\nSafe Entry Radius: ${formatNumber(safeEntryRadius)} m\nBall Horizontal Distance: ${formatNumber(this.getBallHorizontalDistanceToHoop())} m\nSwish State: ${this.captureType ? `${this.captureType}_CAPTURE` : 'OFF'}\nRim Collision Enabled: ${this.state === 'NET_CAPTURE' ? 'NO' : 'YES'}\nNet Capture: ${this.state === 'NET_CAPTURE' ? 'ACTIVE' : 'OFF'}\nNet Capture Time: ${this.netCaptureStartedAt ? formatNumber(now - this.netCaptureStartedAt, 1) : '--'} ms\nNet Entry Velocity: ${this.formatVector(this.shotResult.netCaptureEntryVelocity)}\nNet Current Velocity: ${this.formatVector(this.state === 'NET_CAPTURE' ? this.ballBody.getLinearVelocity() : this.shotResult.netCaptureExitVelocity)}\nNet Exit Velocity: ${this.formatVector(this.shotResult.netCaptureExitVelocity)}\nRim Geometry: inner ${formatNumber(this.hoop.rimRadius)} / tube ${formatNumber(this.physics.rimColliderCenterRadius - this.hoop.rimRadius)} / center ${formatNumber(this.physics.rimColliderCenterRadius)} / collider ${formatNumber(this.physics.rimColliderRadius)} / ball ${formatNumber(this.physics.ballRadius)}`
      : ''
    const physics = DEBUG_SHOT_PHYSICS && this.shotResult
      ? `\nShot #${this.shotResult.shotId}\nBall Control: PHYSICS\nBall Motion: ${this.getMotionTypeName()}\nBall Velocity: ${this.formatVector(this.ballBody.getLinearVelocity())}\nBall Speed: ${formatNumber(this.vectorLength(this.ballBody.getLinearVelocity()))} m/s\nTrajectory Time: ${formatNumber(this.currentFlightElapsedMs, 1)} ms\nRim Arrival T: ${formatNumber(this.shotResult.flightDurationMs, 1)} ms\nPost Shot Time: ${this.postShotStartedAt ? formatNumber(now - this.postShotStartedAt, 1) : '--'} ms\nShot #${this.shotResult.shotId}\nDistance: ${formatNumber(this.shotResult.shotDistanceMeters)} m\nRelease Height: ${formatNumber(this.shotResult.releaseHeight)} m\nLaunch Angle: ${formatNumber(this.shotResult.launchAngleDegrees, 2)} deg\nGravity: ${formatNumber(this.physics.gravity, 2)} m/s²\nFlight Duration: ${formatNumber(this.shotResult.flightDurationMs, 1)} ms\nLaunch Speed: ${formatNumber(this.vectorLength(this.shotResult.launchVelocity))} m/s\nApex Height: ${formatNumber(this.shotResult.apexHeight)} m\nRim Arrival Speed: ${formatNumber(this.vectorLength(this.shotResult.rimArrivalVelocity))} m/s\nRim Arrival Vertical: ${formatNumber(this.shotResult.rimArrivalVelocity?.y)} m/s\nTiming Error: ${formatNumber(this.shotResult.timingError, 1)} ms\nHorizontal Error: ${formatNumber(this.shotResult.horizontalError)} m\nDepth Error: ${formatNumber(this.shotResult.depthError)} m\nArc Bias: ${formatNumber(this.shotResult.arcError, 2)}\nFlight Time Scale: ${formatNumber(this.shotResult.flightTimeScale)}\nTarget: ${this.formatVector(this.shotResult.targetPosition)}\nLaunch Velocity: ${this.formatVector(this.shotResult.launchVelocity)}\nFirst Rim Contact: ${this.shotResult.firstRimContact ?? '--'}\nRim Contacts: ${formatNumber(this.shotResult.rimContactCount, 0)}\nResult: ${this.shotResult.finalResult ?? this.outcome}`
      : ''
    const physicsWithAngleBias = physics.replace(
      /Flight Time Scale: [^\n]*/,
      `Launch Angle Bias: ${formatNumber(this.shotResult?.launchAngleVariationDegrees, 2)} deg`,
    )
    this.overlay.textContent = `Shot: ${this.state}\n${holding}${result}\nGreen: ${formatNumber(greenWindow.startMs, 1)} - ${formatNumber(greenWindow.endMs, 1)} ms\nPhase: ${phase}\nVisual Progress: ${visualProgress}%\nInput: ${source}\nActive Pointer: ${pointer}${entryAngle}${compression}${netCapture}${physicsWithAngleBias}`
  }

  createPhysicalMissSolution(shotOutcome, baseShotSolution) {
    const targetPosition = shotOutcome.targetPosition
    const solution = applyShotVariation(baseShotSolution, {
      targetPosition,
      launchAngleVariationDegrees: shotOutcome.launchAngleVariationDegrees,
      gravity: this.physics.gravity,
    })
    this.shotResult.targetPosition = toPlainVector(targetPosition)
    this.shotResult.launchVelocity = toPlainVector(solution.launchVelocity)
    this.shotResult.flightDurationMs = solution.flightDurationMs
    this.shotResult.apexHeight = solution.apexHeight
    this.shotResult.rimArrivalVelocity = solution.rimArrivalVelocity
    this.shotResult.launchAngleDegrees = solution.launchAngleDegrees
    this.shotResult.entryAngleDegrees = solution.entryAngleDegrees
    this.shotResult.shotDistanceMeters = solution.horizontalDistance
    this.shotResult.releaseHeight = baseShotSolution.releasePosition.y
    this.flightDurationMs = solution.flightDurationMs
    return solution
  }

  launchPhysicsBall(solution, profile) {
    // TELEPORT is for synchronizing a held/reset mesh. Leaving it enabled
    // would overwrite the dynamic Havok transform every physics step.
    this.ballBody.setPrestepType(PhysicsPrestepType.DISABLED)
    const velocity = solution.baseLaunchVelocity ?? solution.launchVelocity
    this.shotCompression = createShotTimeCompression({
      launchVelocity: velocity,
      worldGravity: this.physics.gravity,
      timeCompression: solution.skipShotTimeCompression ? 1 : profile.shotTimeCompression,
    })
    const compressedVelocity = this.shotCompression.launchVelocity
    const launchVelocity = new Vector3(compressedVelocity.x, compressedVelocity.y, compressedVelocity.z)
    this.ballBody.setLinearVelocity(Vector3.Zero())
    this.ballBody.setAngularVelocity(Vector3.Zero())
    // The ballistic solver assumes no air drag. Leaving Havok's rolling/body
    // damping enabled here shortened a centre shot by roughly 4%, which made a
    // physically accurate swish prediction correctly reject its future path.
    this.ballBody.setLinearDamping(0)
    this.ballBody.setLinearVelocity(launchVelocity)
    this.ballBody.setAngularVelocity(new Vector3(0, profile.rotationRadiansPerMs * 1000, 0))
    this.shotTrajectoryActive = true
    this.previousPhysicsPosition.copyFrom(this.ball.position)
    this.hasPhysicsPositionSample = true
    this.expectedLaunchVelocity = { ...compressedVelocity }
    this.flightDurationMs *= this.shotCompression.timeCompression
    if (this.shotResult) {
      this.shotResult.uncompressedFlightDurationMs = this.shotResult.flightDurationMs
      this.shotResult.uncompressedRimArrivalVelocity = toPlainVector(this.shotResult.rimArrivalVelocity)
      this.shotResult.flightDurationMs = this.flightDurationMs
      this.shotResult.launchVelocity = { ...compressedVelocity }
      if (this.shotResult.rimArrivalVelocity) {
        this.shotResult.rimArrivalVelocity = {
          x: this.shotResult.rimArrivalVelocity.x * this.shotCompression.velocityScale,
          y: this.shotResult.rimArrivalVelocity.y * this.shotCompression.velocityScale,
          z: this.shotResult.rimArrivalVelocity.z * this.shotCompression.velocityScale,
        }
      }
      this.shotResult.shotTimeCompression = this.shotCompression.timeCompression
      this.shotResult.effectiveShotGravity = this.shotCompression.effectiveGravity
    }
    this.launchDebugFrame = 0
    if (DEBUG_SHOT_PHYSICS) console.debug('=== BALL LAUNCH ===', {
      calculatedLaunchVelocity: this.expectedLaunchVelocity,
      velocityImmediatelyAfterSet: this.toPlainVector(this.ballBody.getLinearVelocity()),
      launchBodyId: this.getPhysicsBodyId(),
      debugVelocityBodyId: this.getPhysicsBodyId(),
      shotState: this.state,
      motionType: this.getMotionTypeName(),
      prestepType: this.ballBody.getPrestepType(),
      timeCompression: this.shotCompression.timeCompression,
      effectiveShotGravity: this.shotCompression.effectiveGravity,
    })
  }

  updateShotPhysics() {
    if (!this.physicsFlight) return

    const current = this.ball.position
    if (this.state === 'BALL_IN_FLIGHT') {
      // Arm only in the short entry zone, then solve the future rim-plane
      // crossing analytically. This gives Havok enough lead time to apply the
      // clean-swishing collision mask before the ball's surface touches rim.
      if (!this.tryCommitEarlySwish(current)) {
        if (this.shotTrajectoryActive && this.shotCompression?.extraGravity > 0) {
          this.extraGravityForce.set(0, -this.physics.ballMassKg * this.shotCompression.extraGravity, 0)
          this.ballBody.applyForce(this.extraGravityForce, this.ball.getAbsolutePosition())
        }
      }
    }

    if (this.state === 'NET_CAPTURE') {
      if (this.tryConfirmNetExit(current)) {
        this.previousPhysicsPosition.copyFrom(current)
        this.hasPhysicsPositionSample = true
        return
      }
      const currentVelocity = this.ballBody.getLinearVelocity()
      const physicsDt = this.physics.physicsTimeStep ?? (1 / 120)
      applyNetDampingVelocity(currentVelocity, physicsDt, this.netCaptureVelocity)
      this.ballBody.setLinearVelocity(this.netCaptureVelocity)
    }

    this.previousPhysicsPosition.copyFrom(current)
    this.hasPhysicsPositionSample = true
  }

  handlePhysicsCollision(event) {
    if (!this.physicsFlight || !['BALL_IN_FLIGHT', 'NET_CAPTURE', 'POST_SHOT'].includes(this.state)) return
    const against = event.collidedAgainst
    const now = GameClock.now()
    const rimRegion = this.physics.rimBodies.get(against)
    if (DEBUG_SHOT_PHYSICS && rimRegion) {
      console.debug('=== RIM COLLISION ===', {
        region: rimRegion,
        swishCommitted: this.shotResult?.hoopEntry === true,
        ...this.getMotionDebugSnapshot(),
      })
    }
    if (this.state !== 'NET_CAPTURE' && rimRegion && now - this.lastRimContactAt >= 40) {
      this.lastRimContactAt = now
      recordRimContact(this.shotResult, rimRegion)
    }
    if (this.state === 'BALL_IN_FLIGHT' && (rimRegion || against === this.physics.boardBody)) {
      this.shotTrajectoryActive = false
      this.restoreBallLinearDamping()
    }
    if (against === this.physics.boardBody) this.shotResult.hitBackboard = true
    if (against === this.physics.floorBody && !this.hasHitFloor) {
      this.hasHitFloor = true
      this.floorContactAt = now
    }
  }

  updatePhysicalFlight(elapsed, now) {
    const current = this.ball.position
    this.debugTrajectoryPoints.push({ x: current.x, y: current.y, z: current.z })
    if (this.debugTrajectoryPoints.length > 30) this.debugTrajectoryPoints.shift()
    this.previousBallPosition.x = current.x
    this.previousBallPosition.y = current.y
    this.previousBallPosition.z = current.z
  }

  getSafeEntryRadius() {
    return getSafeEntryRadius({
      rimInnerRadius: this.hoop.rimRadius,
      ballRadius: this.physics.ballRadius,
      rimColliderCenterRadius: this.physics.rimColliderCenterRadius,
      rimColliderRadius: this.physics.rimColliderRadius,
    })
  }

  getBallHorizontalDistanceToHoop() {
    return Math.hypot(this.ball.position.x - this.hoop.rimCenter.x, this.ball.position.z - this.hoop.rimCenter.z)
  }

  getActiveShotGravity() {
    return this.shotTrajectoryActive && Number.isFinite(this.shotCompression?.effectiveGravity)
      ? this.shotCompression.effectiveGravity
      : this.physics.gravity
  }

  tryCommitEarlySwish(currentPosition) {
    if (this.state !== 'BALL_IN_FLIGHT') return false
    const velocity = this.ballBody.getLinearVelocity()
    const heightAboveRim = currentPosition.y - this.hoop.rimCenter.y
    const isInEntryArmZone = isFiniteVector(velocity)
      && velocity.y < 0
      && heightAboveRim > 0
      && heightAboveRim <= HOOP_ENTRY_HEIGHT_METERS
    if (!isInEntryArmZone) {
      this.latestSwishPrediction = null
      return false
    }

    const crossing = predictRimPlaneCrossing({
      position: currentPosition,
      velocity,
      rimCenter: this.hoop.rimCenter,
      gravity: this.getActiveShotGravity(),
    })
    this.latestSwishPrediction = crossing
    if (!crossing || crossing.horizontalDistance > this.getSafeEntryRadius()) return false
    return this.beginNetCapture(GameClock.now(), crossing, heightAboveRim)
  }

  tryConfirmNetExit(currentPosition) {
    if (!this.hasPhysicsPositionSample || this.state !== 'NET_CAPTURE') return false
    const exitPlaneY = getNetExitPlaneY(this.hoop.rimCenter.y, this.hoop.netHeight)
    const crossing = getSweptPlaneCrossing({
      previousPosition: this.previousPhysicsPosition,
      currentPosition,
      planeY: exitPlaneY,
      referencePosition: this.hoop.rimCenter,
    })
    if (!crossing || this.ballBody.getLinearVelocity().y >= 0) return false
    return this.markMade(GameClock.now())
  }

  beginNetCapture(now, crossing, heightAboveRim) {
    if (this.state !== 'BALL_IN_FLIGHT') return false
    this.shotTrajectoryActive = false
    this.restoreBallLinearDamping()
    this.netCaptureStartedAt = now
    this.netCaptureEntryVelocity = toPlainVector(this.ballBody.getLinearVelocity())
    this.captureType = this.shotResult.rimContactCount > 0 ? 'RIM' : 'CLEAN'
    this.netCaptureExitVelocity = null
    this.shotResult.hoopEntry = true
    this.shotResult.safeEntryRadius = this.getSafeEntryRadius()
    this.shotResult.swishPrediction = {
      position: { ...crossing.position },
      timeSeconds: crossing.timeSeconds,
      horizontalDistance: crossing.horizontalDistance,
    }
    this.shotResult.rimPlaneCrossing = null
    this.shotResult.crossDistance = crossing.horizontalDistance
    this.shotResult.passRadius = this.shotResult.safeEntryRadius
    this.shotResult.commitHeightAboveRim = heightAboveRim
    this.shotResult.rimContactsBeforeCommit = this.shotResult.rimContactCount
    this.shotResult.entryPosition = toPlainVector(this.ball.position)
    this.shotResult.netCaptureEntryVelocity = { ...this.netCaptureEntryVelocity }
    this.shotResult.netImpactData = {
      entryPosition: { ...this.shotResult.entryPosition },
      entryVelocity: { ...this.netCaptureEntryVelocity },
      horizontalSpeed: Math.hypot(this.netCaptureEntryVelocity.x, this.netCaptureEntryVelocity.z),
      verticalSpeed: this.netCaptureEntryVelocity.y,
      entryOffsetX: this.ball.position.x - this.hoop.rimCenter.x,
      entryOffsetZ: this.ball.position.z - this.hoop.rimCenter.z,
      makeType: this.captureType,
    }
    this.hoop.netVisual?.onBallEnter(this.shotResult.netImpactData)
    // All shots retained normal rim collision until this proven, safe entry.
    // Disabling it now prevents lower/side rim nodes from ejecting a ball that
    // is already inside the net channel.
    this.physics.ballShape.filterCollideMask = this.physics.collision.WORLD
    this.captureDebugStage = 0
    this.state = 'NET_CAPTURE'
    if (DEBUG_SHOT_PHYSICS) console.debug('=== EARLY SWISH COMMIT ===', {
      ballPosition: this.shotResult.entryPosition,
      ballVelocity: this.netCaptureEntryVelocity,
      heightAboveRim: this.shotResult.commitHeightAboveRim,
      predictedTimeSeconds: this.shotResult.swishPrediction.timeSeconds,
      predictedRimPosition: this.shotResult.swishPrediction.position,
      predictedDistance: this.shotResult.crossDistance,
      safeRadius: this.shotResult.passRadius,
      rimContactsBeforeCommit: this.shotResult.rimContactsBeforeCommit,
      captureType: this.captureType,
      rimCollisionEnabled: false,
    })
    if (DEBUG_SHOT_PHYSICS) console.debug('=== HOOP ENTRY / NET CAPTURE ===', this.getMotionDebugSnapshot())
    return true
  }

  markMade(now) {
    if (this.shotHasScored) return false
    this.shotHasScored = true
    this.shotResult.made = true
    this.shotResult.finalResult = this.shotResult.rimContactCount ? 'RIM_MAKE' : 'CLEAN_MAKE'
    this.shotResult.makeType = this.shotResult.rimContactCount ? 'RIM' : 'CLEAN'
    this.shotResult.hoopExit = true
    this.shotResult.actualRimArrivalMs = now - this.flightStartTime
    this.madeAt = now
    this.makeDebugStage = 1
    this.shotResult.netCaptureExitVelocity = toPlainVector(this.ballBody.getLinearVelocity())
    this.restoreBallLinearDamping()
    this.physics.ballShape.filterCollideMask = this.physics.collision.WORLD | this.physics.collision.RIM
    this.postShotStartedAt = now
    this.state = 'POST_SHOT'
    if (DEBUG_SHOT_PHYSICS) console.debug('=== HOOP EXIT / MAKE EVENT ===', {
      ...this.getMotionDebugSnapshot(),
      exitVelocity: this.shotResult.netCaptureExitVelocity,
      trajectoryPoints: this.debugTrajectoryPoints,
    })
    return true
  }

  shouldCompletePhysicalFlight(elapsed, now) {
    const velocity = this.ballBody.getLinearVelocity()
    const speed = velocity.length()
    const outOfBounds = Math.abs(this.ball.position.x) > 10 || Math.abs(this.ball.position.z) > 11 || this.ball.position.y < -1
    const postFloorDelayElapsed = this.hasHitFloor && now - this.floorContactAt >= 450
    const postShotTimeout = this.postShotStartedAt && now - this.postShotStartedAt >= 2200
    return elapsed >= 5000 || outOfBounds || postFloorDelayElapsed || postShotTimeout || (elapsed >= 1600 && speed < 0.22)
  }

  enterResult(now) {
    if (!this.shotResult.finalResult) {
      this.shotResult.finalResult = this.shotResult.made
        ? (this.shotResult.rimContactCount ? 'RIM_MAKE' : 'CLEAN_MAKE')
        : this.getMissResult()
    }
    this.state = 'RESULT'
    this.resultEndTime = now + RESULT_DISPLAY_MS
    this.refreshUi(now)
  }

  getMissResult() {
    if (this.shotResult.hitBackboard && !this.shotResult.rimContactCount) return 'BACKBOARD_MISS'
    if (this.shotResult.rimContactCount > 1) return 'MULTI_RIM_MISS'
    if (this.shotResult.rimContactCount === 1) return `${this.shotResult.firstRimContact}_MISS`
    return 'AIRBALL'
  }

  restoreBallLinearDamping() {
    this.ballBody.setLinearDamping(this.defaultBallLinearDamping)
  }

  formatVector(vector) { return formatVector(vector) }

  logShotSolution() {
    // One event per release; randomness is never generated from update().
    console.debug('[Swish Shot Physics]', {
      shotId: this.shotResult.shotId,
      timing: this.timingResult.result,
      timingError: this.shotResult.timingError,
      horizontalError: this.shotResult.horizontalError,
      depthError: this.shotResult.depthError,
      arcError: this.shotResult.arcError,
      targetPosition: this.shotResult.targetPosition,
      launchVelocity: this.shotResult.launchVelocity,
      flightDurationMs: this.shotResult.flightDurationMs,
      launchAngleDegrees: this.shotResult.launchAngleDegrees,
    })
    const duration = this.shotResult.flightDurationMs
    if (duration > 1350 || duration < 550) {
      console.warn('[Swish Shot Physics] SHOT_FLIGHT_OUTSIDE_SANITY_RANGE', { duration })
    }
  }

  vectorLength(vector) { return vectorLength(vector) }

  getMotionTypeName() {
    const motionType = this.ballBody.getMotionType()
    if (motionType === PhysicsMotionType.DYNAMIC) return 'DYNAMIC'
    if (motionType === PhysicsMotionType.ANIMATED) return 'ANIMATED'
    return 'STATIC'
  }

  getMotionDebugSnapshot() {
    const velocity = this.ballBody.getLinearVelocity()
    return {
      position: { x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      shotState: this.state,
      ballControlMode: 'PHYSICS',
      physicsMotionType: this.getMotionTypeName(),
    }
  }

  logMakeMotion(now) {
    if (!DEBUG_SHOT_PHYSICS || !this.madeAt) return
    const elapsed = now - this.madeAt
    if (this.makeDebugStage === 1 && elapsed >= 100) {
      this.makeDebugStage = 2
      console.debug('=== MAKE +100ms ===', this.getMotionDebugSnapshot())
    }
    if (this.makeDebugStage === 2 && elapsed >= 300) {
      this.makeDebugStage = 3
      console.debug('=== MAKE +300ms ===', this.getMotionDebugSnapshot())
    }
  }

  logNetCaptureTrace(now) {
    if (!DEBUG_SHOT_PHYSICS || this.state !== 'NET_CAPTURE') return
    const elapsed = now - this.netCaptureStartedAt
    const thresholds = [50, 100, 150]
    const nextThreshold = thresholds[this.captureDebugStage]
    if (nextThreshold === undefined || elapsed < nextThreshold) return
    this.captureDebugStage += 1
    console.debug(`=== NET CAPTURE +${nextThreshold}ms ===`, {
      position: toPlainVector(this.ball.position),
      velocity: toPlainVector(this.ballBody.getLinearVelocity()),
      horizontalSpeed: Math.hypot(this.ballBody.getLinearVelocity().x, this.ballBody.getLinearVelocity().z),
      verticalSpeed: this.ballBody.getLinearVelocity().y,
      captureType: this.captureType,
      rimCollisionEnabled: false,
    })
  }

  logLaunchReadback() {
    if (!DEBUG_SHOT_PHYSICS || !this.expectedLaunchVelocity || this.launchDebugFrame >= 2) return
    this.launchDebugFrame += 1
    const actual = this.ballBody.getLinearVelocity()
    console.debug(`=== BALL LAUNCH Frame +${this.launchDebugFrame} ===`, {
      expectedVelocity: this.expectedLaunchVelocity,
      actualVelocity: this.toPlainVector(actual),
      bodyId: this.getPhysicsBodyId(),
      motionType: this.getMotionTypeName(),
    })
    const expectedHorizontal = Math.hypot(this.expectedLaunchVelocity.x, this.expectedLaunchVelocity.z)
    const actualHorizontal = Math.hypot(actual.x, actual.z)
    if (expectedHorizontal > 5 && actualHorizontal < 1) console.error('BALL_LAUNCH_VELOCITY_LOST', {
      expectedVelocity: this.expectedLaunchVelocity,
      actualVelocity: this.toPlainVector(actual),
      shotState: this.state,
      motionType: this.getMotionTypeName(),
      physicsBodyId: this.getPhysicsBodyId(),
    })
  }

  logLaunchTravelDistance(elapsed) {
    if (!DEBUG_SHOT_PHYSICS || this.launchTravelDebugStage >= 2) return
    const threshold = this.launchTravelDebugStage === 0 ? 100 : 200
    if (elapsed < threshold) return
    this.launchTravelDebugStage += 1
    const dx = this.ball.position.x - this.launchPosition.x
    const dy = this.ball.position.y - this.launchPosition.y
    const dz = this.ball.position.z - this.launchPosition.z
    console.debug(`=== BALL TRAVEL +${threshold}ms ===`, {
      distanceMeters: Math.hypot(dx, dy, dz),
      displacement: { x: dx, y: dy, z: dz },
    })
  }

  logGreenFlightTrace() {
    if (!DEBUG_SHOT_PHYSICS || !this.timingResult?.isGreen || this.greenFlightFrame >= 30) return
    this.greenFlightFrame += 1
    if (![1, 5, 15, 30].includes(this.greenFlightFrame)) return
    console.debug(`=== GREEN FLIGHT Frame +${this.greenFlightFrame} ===`, this.getMotionDebugSnapshot())
  }

  getPhysicsBodyId() {
    return this.ballBody._pluginData?.hpBodyId ?? 'unknown'
  }

  toPlainVector(vector) { return toPlainVector(vector) }

  dispose() {
    if (this.beforePhysicsObserver) this.scene.onBeforePhysicsObservable.remove(this.beforePhysicsObserver)
    this.overlay.remove()
    this.meter.dispose()
    this.hoop.netVisual?.dispose()
  }
}
