import { Color3, DirectionalLight, HemisphericLight, Vector3 } from '@babylonjs/core'

export function createLighting(scene) {
  const hemispheric = new HemisphericLight('arena-ambient', new Vector3(0, 1, 0), scene)
  hemispheric.intensity = 0.8
  hemispheric.groundColor = new Color3(0.12, 0.12, 0.14)
  const directional = new DirectionalLight('arena-key', new Vector3(-0.35, -1, 0.25), scene)
  directional.position = new Vector3(5, 9, -4)
  directional.intensity = 0.65
  return { hemispheric, directional }
}
