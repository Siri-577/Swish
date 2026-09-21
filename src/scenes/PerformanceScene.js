import * as Phaser from 'phaser'
import { InputTiming } from '../core/InputTiming.js'
import { PerformanceMonitor } from '../core/PerformanceMonitor.js'

const DEV_MODE = true
const HISTORY_LIMIT = 5

export class PerformanceScene extends Phaser.Scene {
  constructor() {
    super('PerformanceScene')
  }

  create() {
    const { width, height } = this.scale
    this.performanceMonitor = new PerformanceMonitor()
    this.releaseHistory = []
    this.nextInputUiRefresh = 0

    this.inputTiming = new InputTiming({
      onRelease: (duration) => this.recordRelease(duration),
    })
    this.inputTiming.attach()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this)

    this.add.text(width / 2, height / 2 - 180, 'SWISH', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '64px',
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 - 110, 'Performance Foundation', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '28px',
    }).setOrigin(0.5)

    this.monitorText = this.add.text(16, 16, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '18px', lineSpacing: 6,
    })
    this.add.text(width / 2, height / 2 + 5, 'INPUT TIMING TEST', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '26px',
    }).setOrigin(0.5)
    this.inputStatusText = this.add.text(width / 2, height / 2 + 70, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '22px', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 155, 'Timing Stability Test', {
      color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '22px',
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 190, 'Hold SPACE for about half a second, then release.', {
      color: '#a7a7a7', fontFamily: 'Arial, sans-serif', fontSize: '18px',
    }).setOrigin(0.5)
    this.historyText = this.add.text(width / 2, height / 2 + 230, '', {
      color: '#a7a7a7', fontFamily: 'monospace', fontSize: '18px', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0)

    this.refreshInputUi()
    this.refreshMonitorUi()
  }

  update(time, delta) {
    this.performanceMonitor.sample(delta, this.game.loop.actualFps)

    if (DEV_MODE && this.performanceMonitor.shouldRefreshUi(time)) {
      this.refreshMonitorUi()
    }

    if (this.inputTiming.isPressed && time >= this.nextInputUiRefresh) {
      this.nextInputUiRefresh = time + 33
      this.refreshInputUi()
    }
  }

  recordRelease(duration) {
    this.releaseHistory.unshift(duration)
    if (this.releaseHistory.length > HISTORY_LIMIT) this.releaseHistory.pop()
    this.refreshInputUi()
    this.historyText.setText(this.releaseHistory.map((value, index) => `#${index + 1} ${value.toFixed(1)} ms`).join('\n'))
  }

  refreshInputUi() {
    if (this.inputTiming.isPressed) {
      this.inputStatusText.setText(`SPACE: PRESSED\nHolding: ${this.inputTiming.getHeldDuration().toFixed(1)} ms`)
      return
    }

    const lastRelease = this.inputTiming.lastReleaseDuration
    this.inputStatusText.setText(lastRelease === null
      ? 'SPACE: RELEASED\nLast Release: --'
      : `SPACE: RELEASED\nLast Release: ${lastRelease.toFixed(1)} ms`)
  }

  refreshMonitorUi() {
    const renderer = this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas'
    const monitor = this.performanceMonitor
    this.monitorText.setText(
      `FPS: ${Math.round(monitor.fps)}\nFrame: ${monitor.frameTime.toFixed(2)} ms (${monitor.smoothedFrameTime.toFixed(2)} ms avg)\nMax Frame: ${monitor.maxFrameTime.toFixed(2)} ms\nLong Frames: ${monitor.longFrames}\nRenderer: ${renderer}`,
    )
  }

  shutdown() {
    this.inputTiming.detach()
  }
}
