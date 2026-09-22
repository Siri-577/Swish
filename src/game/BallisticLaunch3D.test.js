import assert from 'node:assert/strict'
import test from 'node:test'
import { getBallisticLaunch } from './BallisticLaunch3D.js'

test('ballistic launch reaches a later target while passing through its absolute apex', () => {
  const launch = getBallisticLaunch({ startPosition: { x: 0, y: 1.7, z: -4 }, targetPosition: { x: 0, y: 3.048, z: 5.8 }, apexHeight: 5.25 })
  assert.ok(launch.flightSeconds > 0)
  assert.ok(launch.velocity.y > 0)
  assert.ok(launch.velocity.z > 0)
})
