import assert from 'node:assert/strict'
import test from 'node:test'
import { BallTrajectory3D } from './BallTrajectory3D.js'

const trajectory = new BallTrajectory3D({
  startPosition: { x: 0, y: 1, z: 0 },
  launchVelocity: { x: 4, y: 6, z: 8 },
  gravity: 10,
  durationMs: 1000,
})

test('ballistic 3D trajectory starts at its release position and follows projectile motion', () => {
  assert.deepEqual(trajectory.getPosition(0), { x: 0, y: 1, z: 0 })
  assert.deepEqual(trajectory.getPosition(500), { x: 2, y: 2.75, z: 4 })
})

test('ballistic trajectory exposes the gravity-adjusted exit velocity and clamps after handoff', () => {
  assert.deepEqual(trajectory.getVelocity(500), { x: 4, y: 1, z: 8 })
  assert.deepEqual(trajectory.getPosition(5000), { x: 4, y: 2, z: 8 })
})
