import { Matrix, Vector3, Viewport } from '@babylonjs/core'
import { getGreenZone, getMeterScreenPosition, isWholeMeterGreen } from './ShotMeterMath.js'

const METER_OFFSET = { x: 58, y: 48 }

export class ShotMeterOverlay {
  constructor({ engine, scene, player, profile }) {
    this.engine = engine
    this.scene = scene
    this.player = player
    this.profile = profile
    this.projectedPosition = Vector3.Zero()
    this.anchorPosition = Vector3.Zero()
    this.identityMatrix = Matrix.Identity()
    this.viewport = new Viewport(0, 0, 1, 1)
    this.root = document.createElement('aside')
    this.root.className = 'shot-meter-overlay'
    this.root.innerHTML = '<div class="shot-meter-track"><div class="shot-meter-green-zone"></div><div class="shot-meter-fill"></div></div><div class="shot-meter-result">READY</div>'
    this.fill = this.root.querySelector('.shot-meter-fill')
    this.result = this.root.querySelector('.shot-meter-result')
    this.setProfile(profile)
    document.body.append(this.root)
  }

  setProfile(profile) {
    this.profile = profile
    const greenZone = getGreenZone(profile)
    this.root.style.setProperty('--green-bottom', `${greenZone.bottomPercent}%`)
    this.root.style.setProperty('--green-height', `${greenZone.heightPercent}%`)
  }

  update({ state, timeline, timingResult }) {
    this.fill.style.height = `${timeline.progress * 100}%`
    this.root.classList.toggle('is-active', state !== 'READY')
    this.root.classList.toggle('is-green', isWholeMeterGreen(timingResult, state))
    this.root.classList.toggle('is-descending', timeline.phase === 'DESCENDING')
    this.result.textContent = timingResult?.result ?? (state === 'HOLDING' ? 'HOLD' : 'READY')
    this.updatePosition()
  }

  updatePosition() {
    const camera = this.scene.activeCamera
    if (!camera) return
    const renderWidth = this.engine.getRenderWidth()
    const renderHeight = this.engine.getRenderHeight()
    if (!renderWidth || !renderHeight) return

    this.anchorPosition.copyFrom(this.player.head.absolutePosition)
    this.anchorPosition.y += 0.12
    this.viewport.x = camera.viewport.x * renderWidth
    this.viewport.y = camera.viewport.y * renderHeight
    this.viewport.width = camera.viewport.width * renderWidth
    this.viewport.height = camera.viewport.height * renderHeight
    Vector3.ProjectToRef(this.anchorPosition, this.identityMatrix, this.scene.getTransformMatrix(), this.viewport, this.projectedPosition)

    const cssPosition = getMeterScreenPosition({
      x: this.projectedPosition.x * (this.engine.getRenderingCanvas().clientWidth / renderWidth),
      y: this.projectedPosition.y * (this.engine.getRenderingCanvas().clientHeight / renderHeight),
    }, METER_OFFSET)
    this.root.style.left = `${cssPosition.left}px`
    this.root.style.top = `${cssPosition.top}px`
  }

  dispose() {
    this.root.remove()
  }
}
