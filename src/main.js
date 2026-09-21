import { createEngine } from './3d/createEngine.js'
import { createScene } from './3d/createScene.js'
import { BabylonPerformanceMonitor } from './debug/BabylonPerformanceMonitor.js'
import { ShotFlightController3D } from './game/ShotFlightController3D.js'
import { PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE } from './config/player-shooting-profiles.js'
import { ShootButtonOverlay } from './ui/ShootButtonOverlay.js'
import './style.css'

const canvas = document.querySelector('#renderCanvas')
const engine = createEngine(canvas)
const { scene, hoop, ball, player, shotSpot } = createScene(engine, canvas)
const performanceMonitor = new BabylonPerformanceMonitor(engine, scene)
const shotController = new ShotFlightController3D({ ball, hoop, spot: shotSpot, engine, scene, player, shootingProfile: PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE })
const shootButton = new ShootButtonOverlay({
  onPress: (source, pointerId) => shotController.beginInput(source, pointerId),
  onRelease: (source, pointerId) => shotController.releaseInput(source, pointerId),
  onCancel: (source, pointerId) => shotController.cancelInput(source, pointerId),
})

const handleKeyDown = (event) => shotController.handleKeyDown(event)
const handleKeyUp = (event) => shotController.handleKeyUp(event)
const handleBlur = () => shotController.cancel()
const handleVisibilityChange = () => {
  if (document.hidden) shotController.cancel()
}

window.addEventListener('keydown', handleKeyDown)
window.addEventListener('keyup', handleKeyUp)
window.addEventListener('blur', handleBlur)
document.addEventListener('visibilitychange', handleVisibilityChange)

engine.runRenderLoop(() => {
  shotController.update(performance.now())
  scene.render()
  shootButton.update({ state: shotController.state, activeInputSource: shotController.shotInput.activeInputSource })
  performanceMonitor.update(performance.now())
})

window.addEventListener('resize', () => engine.resize())
window.addEventListener('beforeunload', () => {
  performanceMonitor.dispose()
  shotController.dispose()
  shootButton.dispose()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('blur', handleBlur)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  scene.dispose()
  engine.dispose()
})
