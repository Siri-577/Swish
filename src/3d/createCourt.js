import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core'
import { WORLD_CONFIG } from '../config/world-config.js'

export function createCourt(scene) {
  const { width, length, boundaryInset, paintWidth, paintDepth } = WORLD_CONFIG.court
  const floor = MeshBuilder.CreateGround('half-court', { width, height: length }, scene)
  const floorMaterial = new StandardMaterial('court-material', scene)
  floorMaterial.diffuseColor = new Color3(0.31, 0.22, 0.14)
  floorMaterial.specularColor = new Color3(0, 0, 0)
  floor.material = floorMaterial
  const lineColor = new Color3(0.78, 0.73, 0.63)
  const makeLine = (name, points) => {
    const line = MeshBuilder.CreateLines(name, { points }, scene)
    line.color = lineColor
  }
  const left = -width / 2 + boundaryInset
  const right = width / 2 - boundaryInset
  const far = length / 2 - boundaryInset
  const near = -length / 2 + boundaryInset
  const paintLeft = -paintWidth / 2
  const paintRight = paintWidth / 2
  const paintNear = far - paintDepth
  makeLine('court-border', [new Vector3(left, 0.02, near), new Vector3(left, 0.02, far), new Vector3(right, 0.02, far), new Vector3(right, 0.02, near), new Vector3(left, 0.02, near)])
  makeLine('paint-left', [new Vector3(paintLeft, 0.02, far), new Vector3(paintLeft, 0.02, paintNear)])
  makeLine('paint-right', [new Vector3(paintRight, 0.02, far), new Vector3(paintRight, 0.02, paintNear)])
  makeLine('paint-base', [new Vector3(paintLeft, 0.02, paintNear), new Vector3(paintRight, 0.02, paintNear)])
  return floor
}
