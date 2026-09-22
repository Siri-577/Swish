import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core'
import { WORLD_CONFIG } from '../config/world-config.js'
import { DynamicNetVisual } from '../game/DynamicNetVisual.js'

export function createHoop(scene) {
  const { x, y, z, rimInnerRadius, rimTubeRadius, backboardWidth, backboardHeight, backboardDepth, netHeight, netBottomRadius, netStrandCount } = WORLD_CONFIG.hoop
  const rim = MeshBuilder.CreateTorus('rim', { diameter: rimInnerRadius * 2 + rimTubeRadius * 2, thickness: rimTubeRadius * 2, tessellation: 24 }, scene)
  rim.position = new Vector3(x, y, z)
  const rimMaterial = new StandardMaterial('rim-material', scene)
  rimMaterial.diffuseColor = new Color3(0.95, 0.25, 0.05)
  rim.material = rimMaterial
  const board = MeshBuilder.CreateBox('backboard', { width: backboardWidth, height: backboardHeight, depth: backboardDepth }, scene)
  board.position = new Vector3(x, y + 0.42, z + 0.36)
  const boardMaterial = new StandardMaterial('backboard-material', scene)
  boardMaterial.diffuseColor = new Color3(0.9, 0.92, 0.95)
  boardMaterial.alpha = 0.78
  board.material = boardMaterial
  const support = MeshBuilder.CreateCylinder('hoop-support', { height: 3.5, diameter: 0.12 }, scene)
  support.position = new Vector3(x, 1.75, z + 0.76)
  const supportMaterial = new StandardMaterial('support-material', scene)
  supportMaterial.diffuseColor = new Color3(0.18, 0.18, 0.2)
  support.material = supportMaterial
  const netVisual = new DynamicNetVisual({
    scene,
    hoopCenter: new Vector3(x, y, z),
    rimInnerRadius,
    rimTubeRadius,
    netHeight,
    netBottomRadius,
    strandCount: netStrandCount,
  })
  return {
    rimCenter: new Vector3(x, y, z),
    rimRadius: rimInnerRadius,
    rimHeight: y,
    netHeight,
    backboardPosition: board.position.clone(),
    rim,
    backboard: board,
    net: netVisual.mesh,
    netVisual,
  }
}
