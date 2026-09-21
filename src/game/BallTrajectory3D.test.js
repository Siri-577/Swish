import assert from 'node:assert/strict'
import test from 'node:test'
import { BallTrajectory3D } from './BallTrajectory3D.js'

const trajectory = new BallTrajectory3D({
  startPosition: { x: 0, y: 1, z: 0 },
  targetPosition: { x: 4, y: 2, z: 8 },
  durationMs: 700,
  apexHeight: 5,
})

test('3D trajectory starts and ends at its declared positions', () => {
  assert.deepEqual(trajectory.getPosition(0), { x: 0, y: 1, z: 0 })
  assert.deepEqual(trajectory.getPosition(700), { x: 4, y: 2, z: 8 })
})

test('3D trajectory reaches its configured absolute apex and clamps beyond its duration', () => {
  const midpoint = trajectory.getPosition(350)
  assert.equal(midpoint.y, 5)
  assert.deepEqual(trajectory.getPosition(999), { x: 4, y: 2, z: 8 })
})
