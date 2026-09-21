import { DEFAULT_SHOT_PROFILE } from '../config/shot-profile-config.js'
import { SHOT_TIMING_CONFIG } from '../config/shot-timing-config.js'
import { GameClock } from '../core/GameClock.js'
import { InputTiming } from '../core/InputTiming.js'
import { BallTrajectory3D } from './BallTrajectory3D.js'
import { getShotMeterTimeline, SHOT_METER_PHASE } from './ShotMeterTimeline.js'
import { resolveShotMeterRelease, shouldIgnoreKeyboardRelease } from './ShotMeterRelease.js'
import { getGreenWindow } from './GreenWindow.js'
import { createLockedShotProfile } from './GreenWindowCalculator.js'
import { createShotContext } from './ShotContext.js'
import { ShotTargetResolver3D } from './ShotTargetResolver3D.js'
import { ShotMeterOverlay } from '../ui/ShotMeterOverlay.js'

const RESULT_DISPLAY_MS = 450

export class ShotFlightController3D {
  constructor({ ball, hoop, spot, engine, scene, player, shootingProfile, profile = DEFAULT_SHOT_PROFILE }) {
    this.ball = ball
    this.hoop = hoop
    this.spot = spot
    this.profile = profile
    this.shootingProfile = shootingProfile
    this.activeShotProfile = null
    this.activeShotContext = null
    this.inputTiming = new InputTiming()
    this.state = 'READY'
    this.trajectory = null
    this.flightStartTime = 0
    this.resultEndTime = 0
    this.initialRotation = 0
    this.position = { x: 0, y: 0, z: 0 }
    this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
    this.lastUiUpdate = 0
    this.timingResult = null
    this.outcome = null
    this.meter = new ShotMeterOverlay({ engine, scene, player, profile })
    this.overlay = document.createElement('aside')
    this.overlay.className = 'shot-debug-overlay'
    document.body.append(this.overlay)
    this.resetBall()
    this.refreshUi(GameClock.now())
  }

  getReleasePosition() {
    const { playerPosition, ballOffset } = this.spot
    const profile = this.activeShotProfile ?? this.profile
    return {
      x: playerPosition.x + ballOffset.x,
      y: playerPosition.y + ballOffset.y + profile.releaseHeightOffset,
      z: playerPosition.z + ballOffset.z,
    }
  }

  handleKeyDown(event) {
    if (event.code !== 'Space' || this.state !== 'READY') return
    event.preventDefault()
    if (this.inputTiming.press()) {
      this.lockShotParameters()
      this.state = 'HOLDING'
      this.refreshUi(GameClock.now())
    }
  }

  handleKeyUp(event) {
    if (event.code !== 'Space' || shouldIgnoreKeyboardRelease(this.state)) return
    event.preventDefault()
    const heldDuration = this.inputTiming.release()
    if (heldDuration !== null) this.launch(heldDuration)
  }

  cancel() {
    if (this.state !== 'HOLDING') return
    this.inputTiming.reset()
    this.state = 'READY'
    this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
    this.clearActiveShotParameters()
    this.refreshUi(GameClock.now())
  }

  launch(heldDuration, forced = false) {
    const profile = this.activeShotProfile ?? this.profile
    this.meterTimeline = getShotMeterTimeline(heldDuration, profile)
    this.timingResult = resolveShotMeterRelease({ heldDuration, profile, windows: SHOT_TIMING_CONFIG.windows, forced })
    const resolution = ShotTargetResolver3D.resolve(this.timingResult, this.hoop.rimCenter)
    const startPosition = this.getReleasePosition()
    this.outcome = resolution.outcome
    this.trajectory = new BallTrajectory3D({
      startPosition,
      targetPosition: resolution.targetPosition,
      durationMs: profile.ballFlightDurationMs,
      apexHeight: profile.apexHeight,
    })
    this.flightStartTime = GameClock.now()
    this.initialRotation = this.ball.rotation.y
    this.state = 'BALL_IN_FLIGHT'
    this.refreshUi(this.flightStartTime)
  }

  update(now = GameClock.now()) {
    if (this.state === 'HOLDING') {
      const heldDuration = this.inputTiming.getHeldDuration()
      this.meterTimeline = getShotMeterTimeline(heldDuration, this.activeShotProfile ?? this.profile)
      if (this.meterTimeline.shouldForceRelease) {
        const forcedDuration = this.inputTiming.release()
        if (forcedDuration !== null) this.launch(forcedDuration, true)
      } else if (now - this.lastUiUpdate >= 100) {
        this.refreshUi(now)
      }
    }

    if (this.state === 'BALL_IN_FLIGHT') {
      const profile = this.activeShotProfile ?? this.profile
      const elapsed = now - this.flightStartTime
      this.trajectory.getPosition(elapsed, this.position)
      this.ball.position.copyFromFloats(this.position.x, this.position.y, this.position.z)
      this.ball.rotation.y = this.initialRotation + elapsed * profile.rotationRadiansPerMs
      if (elapsed >= profile.ballFlightDurationMs) {
        this.state = 'RESULT'
        this.resultEndTime = now + RESULT_DISPLAY_MS
        this.refreshUi(now)
      }
    } else if (this.state === 'RESULT' && now >= this.resultEndTime) {
      this.resetBall()
      this.state = 'READY'
      this.meterTimeline = { phase: SHOT_METER_PHASE.IDLE, progress: 0, shouldForceRelease: false }
      this.clearActiveShotParameters()
      this.refreshUi(now)
    }

    this.meter.update({
      state: this.state,
      timeline: this.meterTimeline,
      timingResult: this.timingResult,
    })
  }

  resetBall() {
    const start = this.getReleasePosition()
    this.ball.position.copyFromFloats(start.x, start.y, start.z)
    this.ball.rotation.set(0, 0, 0)
    this.trajectory = null
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
    const holding = this.state === 'HOLDING' ? `Holding: ${this.inputTiming.getHeldDuration().toFixed(1)} ms\n` : ''
    const result = this.timingResult
      ? `Timing: ${this.timingResult.result}\nRelease: ${this.timingResult.heldDuration.toFixed(1)} ms\nError: ${this.timingResult.errorMs.toFixed(1)} ms\nOutcome: ${this.outcome}`
      : 'Timing: --\nRelease: --\nError: --\nOutcome: --'
    const greenWindow = getGreenWindow(this.activeShotProfile ?? this.profile)
    const phase = this.meterTimeline.phase
    const visualProgress = (this.meterTimeline.progress * 100).toFixed(1)
    this.overlay.textContent = `Shot: ${this.state}\n${holding}${result}\nGreen: ${greenWindow.startMs.toFixed(1)} - ${greenWindow.endMs.toFixed(1)} ms\nPhase: ${phase}\nVisual Progress: ${visualProgress}%`
  }

  dispose() {
    this.overlay.remove()
    this.meter.dispose()
  }
}
