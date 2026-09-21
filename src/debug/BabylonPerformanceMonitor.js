export class BabylonPerformanceMonitor {
  constructor(engine, scene, refreshInterval = 200) {
    this.engine = engine
    this.scene = scene
    this.refreshInterval = refreshInterval
    this.lastRefresh = 0
    this.overlay = document.createElement('aside')
    this.overlay.className = 'debug-overlay'
    this.overlay.textContent = 'SWISH\n3D Rendering Foundation\nLoading…'
    document.body.append(this.overlay)
  }

  update(now) {
    if (now - this.lastRefresh < this.refreshInterval) return
    this.lastRefresh = now
    const fps = this.engine.getFps()
    const activeMeshes = this.scene.getActiveMeshes().length
    this.overlay.textContent = `SWISH\n3D Rendering Foundation\nBabylon.js 9.x\nFPS: ${Math.round(fps)}\nFrame: ${fps > 0 ? (1000 / fps).toFixed(2) : '--'} ms\nRenderer: WebGL\nActive Meshes: ${activeMeshes}`
  }

  dispose() {
    this.overlay.remove()
  }
}
