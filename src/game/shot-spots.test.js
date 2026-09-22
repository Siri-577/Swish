import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SHOT_SPOT } from './shot-spots.js'
import { WORLD_CONFIG } from '../config/world-config.js'
import { DEFAULT_SHOT_PROFILE } from '../config/shot-profile-config.js'

test('default shot spot contains player, ball, and camera composition data', () => {
  assert.equal(DEFAULT_SHOT_SPOT.id, 'TOP_KEY')
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.playerPosition).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.ballOffset).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.cameraOffset).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.cameraTargetOffset).sort(), ['x', 'y', 'z'])
})

test('default top-key release is calibrated near NBA three-point distance', () => {
  const releaseX = DEFAULT_SHOT_SPOT.playerPosition.x + DEFAULT_SHOT_SPOT.ballOffset.x
  const releaseZ = DEFAULT_SHOT_SPOT.playerPosition.z + DEFAULT_SHOT_SPOT.ballOffset.z
  const distance = Math.hypot(WORLD_CONFIG.hoop.x - releaseX, WORLD_CONFIG.hoop.z - releaseZ)
  assert.ok(distance >= 7.2 && distance <= 7.3)
  assert.equal(DEFAULT_SHOT_PROFILE.releaseHeight, 2.2)
  assert.equal(DEFAULT_SHOT_PROFILE.baseLaunchAngleDegrees, 51)
})
