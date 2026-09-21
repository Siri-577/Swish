import * as Phaser from 'phaser'
import { SHOT_TIMING_CONFIG } from '../config/shot-timing-config.js'
import { PerformanceMonitor } from '../core/PerformanceMonitor.js'
import { ShotTimingEngine } from '../game/ShotTimingEngine.js'
import { ShotInputController } from '../input/ShotInputController.js'

const DEV_MODE = true
const HISTORY_LIMIT = 10
const INPUT_UI_INTERVAL = 33

export class ShotTimingScene extends Phaser.Scene {
  constructor() {
    super('ShotTimingScene')
  }

  create() {
    const { width, height } = this.scale
    this.performanceMonitor = new PerformanceMonitor()
    this.shotHistory = []
    this.shots = 0
    this.greens = 0
    this.totalAbsoluteError = 0
    this.nextInputUiRefresh = 0

    this.shotInput = new ShotInputController({
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

    this.add.text(width / 2, 105, 'SWISH', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '56px',
    }).setOrigin(0.5)
    this.add.text(width / 2, 165, 'Shot Timing Core', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '28px',
    }).setOrigin(0.5)
    this.add.text(width / 2, 225, 'TARGET RELEASE\n500.0 ms', {
      color: '#ffffff', fontFamily: 'monospace', fontSize: '22px', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5)

    this.monitorText = this.add.text(16, 16, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '18px', lineSpacing: 5,
    })
    this.createMeter(width / 2, 325)

    this.statusText = this.add.text(width / 2, 405, 'READY', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '22px', align: 'center', lineSpacing: 7,
    }).setOrigin(0.5)
    this.add.text(width / 2, 505, 'Hold SPACE or SHOOT', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '20px',
    }).setOrigin(0.5)
    this.historyText = this.add.text(260, 550, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '17px', lineSpacing: 3,
    }).setOrigin(0, 0)
    this.statsText = this.add.text(760, 550, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '18px', lineSpacing: 5,
    }).setOrigin(0, 0)

    this.createShootButton(width - 115, height - 115)
    this.refreshMonitorUi()
    this.refreshStatsUi()
  }

  createMeter(centerX, y) {
    const meterWidth = 660
    const meterHeight = 34
    const left = centerX - meterWidth / 2
    const greenStart = left + meterWidth * ((SHOT_TIMING_CONFIG.targetReleaseMs - SHOT_TIMING_CONFIG.windows.greenMs) / SHOT_TIMING_CONFIG.meterDurationMs)
    const greenWidth = meterWidth * ((SHOT_TIMING_CONFIG.windows.greenMs * 2) / SHOT_TIMING_CONFIG.meterDurationMs)

    this.add.rectangle(centerX, y, meterWidth, meterHeight, 0x292929).setStrokeStyle(2, 0x707070)
    this.add.rectangle(greenStart, y, greenWidth, meterHeight - 4, 0x26734d).setOrigin(0, 0.5)
    this.add.rectangle(left + meterWidth * (SHOT_TIMING_CONFIG.targetReleaseMs / SHOT_TIMING_CONFIG.meterDurationMs), y, 3, meterHeight + 14, 0xffffff)
    this.meterFill = this.add.rectangle(left, y, meterWidth, meterHeight - 8, 0xd7d7d7).setOrigin(0, 0.5)
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
    if (DEV_MODE && this.performanceMonitor.shouldRefreshUi(time)) this.refreshMonitorUi()

    if (DEV_MODE && !this.shotInput.ensureConsistentState()) this.cancelShot()

    if (this.shotInput.inputTiming.isPressed) {
      const heldDuration = this.shotInput.inputTiming.getHeldDuration()
      this.meterFill.setScale(Math.min(heldDuration / SHOT_TIMING_CONFIG.meterDurationMs, 1), 1)
      if (time >= this.nextInputUiRefresh) {
        this.nextInputUiRefresh = time + INPUT_UI_INTERVAL
        this.statusText.setText(`HOLDING\nCurrent Hold: ${heldDuration.toFixed(1)} ms`)
      }
    }
  }

  beginShot() {
    this.meterFill.setScale(0, 1)
    this.statusText.setText('HOLDING\nCurrent Hold: 0.0 ms')
    this.setShootButtonPressed(true)
  }

  completeShot(heldDuration) {
    const result = ShotTimingEngine.evaluate({ heldDuration, ...SHOT_TIMING_CONFIG })
    this.shots += 1
    this.totalAbsoluteError += result.absErrorMs
    if (result.isGreen) this.greens += 1
    this.shotHistory.unshift(result)
    if (this.shotHistory.length > HISTORY_LIMIT) this.shotHistory.pop()
    this.meterFill.setScale(Math.min(heldDuration / SHOT_TIMING_CONFIG.meterDurationMs, 1), 1)
    this.statusText.setText(`RESULT: ${result.result}\nRelease: ${heldDuration.toFixed(1)} ms\nError: ${result.errorMs >= 0 ? '+' : ''}${result.errorMs.toFixed(1)} ms`)
    this.setShootButtonPressed(false)
    this.refreshHistoryUi()
    this.refreshStatsUi()
  }

  cancelShot() {
    this.meterFill.setScale(0, 1)
    this.statusText.setText('READY')
    this.setShootButtonPressed(false)
  }

  handleGlobalPointerUp(pointer) {
    this.shotInput.release('pointer', pointer.pointerId)
  }

  refreshHistoryUi() {
    this.historyText.setText(this.shotHistory.map((shot, index) => {
      const signedError = `${shot.errorMs >= 0 ? '+' : ''}${shot.errorMs.toFixed(1)}ms`
      return `#${index + 1} ${shot.result} ${shot.heldDuration.toFixed(1)}ms ${signedError}`
    }).join('\n'))
  }

  refreshStatsUi() {
    const greenPercent = this.shots === 0 ? 0 : (this.greens / this.shots) * 100
    const averageError = this.shots === 0 ? 0 : this.totalAbsoluteError / this.shots
    this.statsText.setText(`Shots: ${this.shots}\nGreens: ${this.greens}\nGreen %: ${greenPercent.toFixed(1)}%\nAvg Error: ${averageError.toFixed(1)} ms`)
  }

  refreshMonitorUi() {
    const renderer = this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'
    const monitor = this.performanceMonitor
    this.monitorText.setText(`FPS: ${Math.round(monitor.fps)}\nFrame: ${monitor.frameTime.toFixed(2)} ms (${monitor.smoothedFrameTime.toFixed(2)} ms avg)\nMax Frame: ${monitor.maxFrameTime.toFixed(2)} ms\nLong Frames: ${monitor.longFrames}\nRenderer: ${renderer}`)
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
