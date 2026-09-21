import { Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core'
import { WORLD_CONFIG } from '../config/world-config.js'

export function createBall(scene) {
  const ball = MeshBuilder.CreateSphere('basketball-placeholder', { diameter: WORLD_CONFIG.ball.diameter, segments: 16 }, scene)
  const material = new StandardMaterial('basketball-material', scene)
  material.diffuseColor = new Color3(0.93, 0.29, 0.03)
  material.specularColor = new Color3(0.1, 0.1, 0.1)
  ball.material = material
  return ball
}
