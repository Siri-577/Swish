import { Color4, Scene } from '@babylonjs/core'
import { createBall } from './createBall.js'
import { createCamera } from './createCamera.js'
import { createCourt } from './createCourt.js'
import { createHoop } from './createHoop.js'
import { createLighting } from './createLighting.js'
import { createPlayerPlaceholder } from './createPlayerPlaceholder.js'
import { DEFAULT_SHOT_SPOT } from '../game/shot-spots.js'

export function createScene(engine, canvas) {
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.035, 0.04, 0.055, 1)
  const hoop = createHoop(scene)
  const camera = createCamera(scene, canvas, DEFAULT_SHOT_SPOT, hoop.rimCenter)
  createLighting(scene)
  createCourt(scene)
  const ball = createBall(scene)
  const player = createPlayerPlaceholder(scene, DEFAULT_SHOT_SPOT.playerPosition)
  return { scene, camera, hoop, ball, player, shotSpot: DEFAULT_SHOT_SPOT }
}
