import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SHOT_SPOT } from './shot-spots.js'

test('default shot spot contains player, ball, and camera composition data', () => {
  assert.equal(DEFAULT_SHOT_SPOT.id, 'TOP_KEY')
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.playerPosition).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.ballOffset).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.cameraOffset).sort(), ['x', 'y', 'z'])
  assert.deepEqual(Object.keys(DEFAULT_SHOT_SPOT.cameraTargetOffset).sort(), ['x', 'y', 'z'])
})
