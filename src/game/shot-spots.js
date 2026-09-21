import { WORLD_CONFIG } from '../config/world-config.js'

const { player, hoop } = WORLD_CONFIG
const { x: playerX, y: playerY, z: playerZ } = player

export const SHOT_SPOTS = {
  TOP_KEY: {
    id: 'TOP_KEY',
    label: 'Top of Key',
    playerPosition: { x: playerX, y: playerY, z: playerZ },
    ballOffset: { x: 0.38, y: 1.45, z: 0.2 },
    cameraOffset: { x: -playerX, y: 4.9, z: -8.1 },
    cameraTargetOffset: { x: 0, y: 1.9 - hoop.y, z: 4.5 - hoop.z },
  },
}

export const DEFAULT_SHOT_SPOT = SHOT_SPOTS.TOP_KEY
