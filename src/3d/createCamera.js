import { UniversalCamera, Vector3 } from '@babylonjs/core'
import { CAMERA_CONFIG } from '../config/camera-config.js'

export function createCamera(scene, canvas, spot, rimCenter) {
  const { fov } = CAMERA_CONFIG
  const position = spot
    ? { x: spot.playerPosition.x + spot.cameraOffset.x, y: spot.playerPosition.y + spot.cameraOffset.y, z: spot.playerPosition.z + spot.cameraOffset.z }
    : CAMERA_CONFIG.position
  const target = spot
    ? { x: rimCenter.x + spot.cameraTargetOffset.x, y: rimCenter.y + spot.cameraTargetOffset.y, z: rimCenter.z + spot.cameraTargetOffset.z }
    : CAMERA_CONFIG.target
  const camera = new UniversalCamera('training-camera', new Vector3(position.x, position.y, position.z), scene)
  camera.setTarget(new Vector3(target.x, target.y, target.z))
  camera.fov = fov
  camera.minZ = 0.1
  camera.attachControl(canvas, false)
  camera.inputs.clear()
  return camera
}
