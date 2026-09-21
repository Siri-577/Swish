import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core'
import { WORLD_CONFIG } from '../config/world-config.js'

export function createPlayerPlaceholder(scene, position) {
  const { x, y, z } = position
  const { bodyHeight, bodyRadius, headDiameter } = WORLD_CONFIG.player
  const body = MeshBuilder.CreateCapsule('player-body', { height: bodyHeight, radius: bodyRadius }, scene)
  body.position = new Vector3(x, y + bodyHeight / 2, z)
  const bodyMaterial = new StandardMaterial('player-body-material', scene)
  bodyMaterial.diffuseColor = new Color3(0.22, 0.42, 0.74)
  body.material = bodyMaterial
  const head = MeshBuilder.CreateSphere('player-head', { diameter: headDiameter, segments: 12 }, scene)
  head.position = new Vector3(x, y + bodyHeight + headDiameter / 2, z)
  const headMaterial = new StandardMaterial('player-head-material', scene)
  headMaterial.diffuseColor = new Color3(0.65, 0.43, 0.27)
  head.material = headMaterial
  return { body, head }
}
