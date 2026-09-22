import assert from 'node:assert/strict'
import test from 'node:test'
import { BallisticTrajectory3D } from './BallisticTrajectory3D.js'

test('ballistic trajectory reaches the shared rim target at its configured duration', () => {
  const trajectory = new BallisticTrajectory3D({
    startPosition: { x: 0, y: 1, z: 0 },
    launchVelocity: { x: 2, y: 6, z: 8 },
    gravity: 10,
    durationMs: 1000,
  })
  assert.deepEqual(trajectory.getPosition(1000), { x: 2, y: 2, z: 8 })
})

test('ballistic trajectory derives its exit velocity from the same gravity equation', () => {
  const trajectory = new BallisticTrajectory3D({
    startPosition: { x: 0, y: 1, z: 0 },
    launchVelocity: { x: 4, y: 6, z: 8 },
    gravity: 10,
    durationMs: 1000,
  })
  const velocity = trajectory.getVelocity(500)
  assert.equal(velocity.x, 4)
  assert.equal(velocity.y, 1)
  assert.equal(velocity.z, 8)
})
