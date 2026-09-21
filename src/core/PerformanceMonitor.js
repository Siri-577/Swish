export class PerformanceMonitor {
  constructor({ uiRefreshInterval = 150 } = {}) {
    this.uiRefreshInterval = uiRefreshInterval
    this.fps = 0
    this.frameTime = 0
    this.smoothedFrameTime = 0
    this.maxFrameTime = 0
    this.longFrames = 0
    this.lastUiRefresh = 0
  }

  sample(delta, fps) {
    const baseline = this.smoothedFrameTime || delta
    const longFrameThreshold = Math.max(50, baseline * 2.5)
    this.fps = fps
    this.frameTime = delta
    this.maxFrameTime = Math.max(this.maxFrameTime, delta)
    if (delta > longFrameThreshold) this.longFrames += 1
    this.smoothedFrameTime = this.smoothedFrameTime === 0
      ? delta
      : this.smoothedFrameTime + (delta - this.smoothedFrameTime) * 0.1
  }

  shouldRefreshUi(now) {
    if (now - this.lastUiRefresh < this.uiRefreshInterval) return false
    this.lastUiRefresh = now
    return true
  }
}
