import * as Phaser from 'phaser'
import { SHOOTING_CONFIG } from '../config/shooting-config.js'
import { SHOT_TIMING_CONFIG } from '../config/shot-timing-config.js'
import { GameClock } from '../core/GameClock.js'
import { PerformanceMonitor } from '../core/PerformanceMonitor.js'
import { BallTrajectory } from '../game/BallTrajectory.js'
import { ShotOutcomeResolver } from '../game/ShotOutcomeResolver.js'
import { ShotTimingEngine } from '../game/ShotTimingEngine.js'
import { ShotInputController } from '../input/ShotInputController.js'
import { Basketball } from '../objects/Basketball.js'
import { Hoop } from '../objects/Hoop.js'

const DEV_MODE = true
const HISTORY_LIMIT = 10
const INPUT_UI_INTERVAL = 33

export class ShootingPrototypeScene extends Phaser.Scene {
  constructor() {
    super('ShootingPrototypeScene')
  }

  create() {
    const { width, height } = this.scale
    this.shotState = 'READY'
    this.performanceMonitor = new PerformanceMonitor()
    this.shotHistory = []
    this.shots = 0
    this.greens = 0
    this.totalAbsoluteError = 0
    this.nextInputUiRefresh = 0
    this.launchTime = 0
    this.rimImpactShown = false

    this.hoop = new Hoop(this, SHOOTING_CONFIG.hoop.x, SHOOTING_CONFIG.hoop.y, SHOOTING_CONFIG.hoop.rimWidth)
    this.ball = new Basketball(this, SHOOTING_CONFIG.ballStart)
    this.createMeter(width / 2, 405)
    this.createShootButton(width - 115, height - 115)

    this.shotInput = new ShotInputController({
      canPress: () => this.shotState === 'READY',
      onPress: () => this.beginShot(),
      onRelease: (duration) => this.completeShot(duration),
      onCancel: () => this.cancelShot(),
    })
    this.shotInput.attach()
    this.pointerCancelHandler = (event) => this.shotInput.cancel('pointer', event.pointerId)
    window.addEventListener('pointercancel', this.pointerCancelHandler)
    this.input.on('pointerup', this.handleGlobalPointerUp, this)
    this.input.on('pointerupoutside', this.handleGlobalPointerUp, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)

    this.add.text(width / 2, 70, 'SWISH', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '52px',
    }).setOrigin(0.5)
    this.add.text(width / 2, 125, 'Ball Flight & Hoop Feedback', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '26px',
    }).setOrigin(0.5)
    this.monitorText = this.add.text(16, 16, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '17px', lineSpacing: 4,
    })
    this.add.text(width / 2, 205, 'TARGET RELEASE  500.0 ms', {
      color: '#ffffff', fontFamily: 'monospace', fontSize: '20px',
    }).setOrigin(0.5)
    this.statusText = this.add.text(width / 2, 475, 'READY', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '21px', align: 'center', lineSpacing: 7,
    }).setOrigin(0.5)
    this.add.text(width / 2, 545, 'Hold SPACE or SHOOT', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '19px',
    }).setOrigin(0.5)
    this.historyText = this.add.text(34, 555, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '15px', lineSpacing: 2,
    })
    this.statsText = this.add.text(750, 555, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '17px', lineSpacing: 4,
    })
    this.refreshMonitorUi()
    this.refreshStatsUi()
  }

  createMeter(centerX, y) {
    const width = 560
    const height = 28
    const left = centerX - width / 2
    const targetProgress = SHOT_TIMING_CONFIG.targetReleaseMs / SHOT_TIMING_CONFIG.meterDurationMs
    const greenStart = (SHOT_TIMING_CONFIG.targetReleaseMs - SHOT_TIMING_CONFIG.windows.greenMs) / SHOT_TIMING_CONFIG.meterDurationMs
    const greenWidth = (SHOT_TIMING_CONFIG.windows.greenMs * 2) / SHOT_TIMING_CONFIG.meterDurationMs
    this.add.rectangle(centerX, y, width, height, 0x292929).setStrokeStyle(2, 0x707070)
    this.add.rectangle(left + width * greenStart, y, width * greenWidth, height - 4, 0x26734d).setOrigin(0, 0.5)
    this.add.rectangle(left + width * targetProgress, y, 3, height + 12, 0xffffff)
    this.meterFill = this.add.rectangle(left, y, width, height - 8, 0xd7d7d7).setOrigin(0, 0.5)
    this.meterFill.setScale(0, 1)
  }

  createShootButton(x, y) {
    this.shootButton = this.add.rectangle(x, y, 140, 110, 0x3d7a5d, 0.95).setStrokeStyle(2, 0xb7e3c8).setInteractive()
    this.add.text(x, y, 'SHOOT', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '26px', fontStyle: 'bold',
    }).setOrigin(0.5)
    this.shootButton.on('pointerdown', (pointer) => this.shotInput.press('pointer', pointer.pointerId))
    this.shootButton.on('pointerup', (pointer) => this.shotInput.release('pointer', pointer.pointerId))
  }

  update(time, delta) {
    this.performanceMonitor.sample(delta, this.game.loop.actualFps)
    this.hoop.updateFeedback(GameClock.now())
    if (DEV_MODE && this.performanceMonitor.shouldRefreshUi(time)) this.refreshMonitorUi()
    if (DEV_MODE && !this.shotInput.ensureConsistentState()) this.cancelShot()

    if (this.shotState === 'HOLDING') this.updateHolding(time)
    if (this.shotState === 'BALL_IN_FLIGHT') this.updateBallFlight()
  }

  updateHolding(time) {
    const heldDuration = this.shotInput.inputTiming.getHeldDuration()
    this.meterFill.setScale(Math.min(heldDuration / SHOT_TIMING_CONFIG.meterDurationMs, 1), 1)
    if (time >= this.nextInputUiRefresh) {
      this.nextInputUiRefresh = time + INPUT_UI_INTERVAL
      this.statusText.setText(`HOLDING\nCurrent Hold: ${heldDuration.toFixed(1)} ms`)
    }
  }

  beginShot() {
    this.shotState = 'HOLDING'
    this.meterFill.setScale(0, 1)
    this.statusText.setText('HOLDING\nCurrent Hold: 0.0 ms')
    this.setShootButtonPressed(true)
  }

  completeShot(heldDuration) {
    const timing = ShotTimingEngine.evaluate({ heldDuration, ...SHOT_TIMING_CONFIG })
    const outcome = ShotOutcomeResolver.resolve(timing, SHOOTING_CONFIG.hoop)
    this.shots += 1
    this.totalAbsoluteError += timing.absErrorMs
    if (timing.isGreen) this.greens += 1
    this.shotHistory.unshift({ timing, outcome })
    if (this.shotHistory.length > HISTORY_LIMIT) this.shotHistory.pop()
    this.meterFill.setScale(Math.min(heldDuration / SHOT_TIMING_CONFIG.meterDurationMs, 1), 1)
    this.statusText.setText(`Timing: ${timing.result}\nOutcome: ${outcome.type}\nRelease: ${heldDuration.toFixed(1)} ms\nError: ${timing.errorMs >= 0 ? '+' : ''}${timing.errorMs.toFixed(1)} ms`)
    this.setShootButtonPressed(false)
    this.refreshHistoryUi()
    this.refreshStatsUi()
    this.launchBall(outcome)
  }

  launchBall(outcome) {
    this.ball.resetToStart()
    this.ball.launch(this.createFlightSegments(outcome), SHOOTING_CONFIG.rotationRadiansPerMs)
    this.launchTime = GameClock.now()
    this.rimImpactShown = false
    this.shotState = 'BALL_IN_FLIGHT'
  }

  createFlightSegments(outcome) {
    const start = SHOOTING_CONFIG.ballStart
    const rim = SHOOTING_CONFIG.hoop
    if (outcome.type === 'SWISH') {
      const primaryDuration = SHOOTING_CONFIG.greenPrimaryDurationMs
      return [
        { phase: 'FLIGHT_TO_RIM', duration: primaryDuration, trajectory: new BallTrajectory({ startX: start.x, startY: start.y, targetX: rim.x, targetY: rim.y, duration: primaryDuration, arcHeight: SHOOTING_CONFIG.greenArcHeight }) },
        { phase: 'SWISH_DROP', duration: SHOOTING_CONFIG.ballFlightDurationMs - primaryDuration, trajectory: new BallTrajectory({ startX: rim.x, startY: rim.y, targetX: rim.x, targetY: rim.y + 118, duration: SHOOTING_CONFIG.ballFlightDurationMs - primaryDuration }) },
      ]
    }

    if (!outcome.hasBounce) {
      const target = outcome.cleanTarget
      return [
        { phase: 'CLEAN_MISS', duration: SHOOTING_CONFIG.ballFlightDurationMs, trajectory: new BallTrajectory({ startX: start.x, startY: start.y, targetX: target.x, targetY: target.y, duration: SHOOTING_CONFIG.ballFlightDurationMs, arcHeight: SHOOTING_CONFIG.missArcHeight }) },
        { phase: 'FALLING', duration: 190, trajectory: new BallTrajectory({ startX: target.x, startY: target.y, targetX: target.x + (target.x < rim.x ? -30 : 30), targetY: target.y + 155, duration: 190 }) },
      ]
    }

    const contact = outcome.contactPoint
    const apex = {
      x: contact.x + outcome.bounceDirection * outcome.horizontalOffset * 0.45,
      y: contact.y - outcome.bounceHeight * 0.45,
    }
    return [
      { phase: 'FLIGHT_TO_RIM', duration: SHOOTING_CONFIG.rimApproachDurationMs, trajectory: new BallTrajectory({ startX: start.x, startY: start.y, targetX: contact.x, targetY: contact.y, duration: SHOOTING_CONFIG.rimApproachDurationMs, arcHeight: SHOOTING_CONFIG.missArcHeight }) },
      { phase: 'RIM_BOUNCE', duration: SHOOTING_CONFIG.rimBounceDurationMs, trajectory: new BallTrajectory({ startX: contact.x, startY: contact.y, targetX: apex.x, targetY: apex.y, duration: SHOOTING_CONFIG.rimBounceDurationMs, controlX: contact.x + outcome.bounceDirection * 38, controlY: contact.y - outcome.bounceHeight }) },
      { phase: 'FALLING', duration: SHOOTING_CONFIG.fallDurationMs, trajectory: new BallTrajectory({ startX: apex.x, startY: apex.y, targetX: apex.x + outcome.bounceDirection * outcome.horizontalOffset * 0.55, targetY: contact.y + 195, duration: SHOOTING_CONFIG.fallDurationMs }) },
    ]
  }

  updateBallFlight() {
    if (this.ball.updateFlight(GameClock.now() - this.launchTime)) {
      this.ball.resetToStart()
      this.meterFill.setScale(0, 1)
      this.shotState = 'READY'
    }
    if (this.ball.phase === 'RIM_BOUNCE' && !this.rimImpactShown) {
      this.hoop.impact(GameClock.now())
      this.rimImpactShown = true
    }
  }

  cancelShot() {
    if (this.shotState !== 'HOLDING') return
    this.meterFill.setScale(0, 1)
    this.statusText.setText('READY')
    this.setShootButtonPressed(false)
    this.shotState = 'READY'
  }

  handleGlobalPointerUp(pointer) {
    this.shotInput.release('pointer', pointer.pointerId)
  }

  refreshHistoryUi() {
    this.historyText.setText(this.shotHistory.map((shot, index) => `#${index + 1} ${shot.timing.result} → ${shot.outcome.type}`).join('\n'))
  }

  refreshStatsUi() {
    const greenPercent = this.shots === 0 ? 0 : (this.greens / this.shots) * 100
    const averageError = this.shots === 0 ? 0 : this.totalAbsoluteError / this.shots
    this.statsText.setText(`Shots: ${this.shots}\nGreens: ${this.greens}\nGreen %: ${greenPercent.toFixed(1)}%\nAvg Error: ${averageError.toFixed(1)} ms`)
  }

  refreshMonitorUi() {
    const renderer = this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'
    const monitor = this.performanceMonitor
    this.monitorText.setText(`FPS: ${Math.round(monitor.fps)}\nFrame: ${monitor.frameTime.toFixed(2)} ms\nMax Frame: ${monitor.maxFrameTime.toFixed(2)} ms\nLong Frames: ${monitor.longFrames}\nRenderer: ${renderer}`)
  }

  setShootButtonPressed(isPressed) {
    this.shootButton.setFillStyle(isPressed ? 0x5aa879 : 0x3d7a5d, 0.95)
    this.shootButton.setScale(isPressed ? 0.96 : 1)
  }

  shutdown() {
    this.shotInput.detach()
    window.removeEventListener('pointercancel', this.pointerCancelHandler)
    this.input.off('pointerup', this.handleGlobalPointerUp, this)
    this.input.off('pointerupoutside', this.handleGlobalPointerUp, this)
  }
}
