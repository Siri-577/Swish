import assert from 'node:assert/strict'
import test from 'node:test'
import { BallTrajectory } from './BallTrajectory.js'

const trajectory = new BallTrajectory({
  startX: 10, startY: 100, targetX: 110, targetY: 80, duration: 700, arcHeight: 80,
})

test('returns the exact start and end at trajectory bounds', () => {
  assert.deepEqual(trajectory.getPosition(0), { x: 10, y: 100 })
  assert.deepEqual(trajectory.getPosition(700), { x: 110, y: 80 })
})

test('curves upward at the midpoint and clamps elapsed time', () => {
  const midpoint = trajectory.getPosition(350)
  assert.equal(midpoint.x, 60)
  assert.ok(midpoint.y < 90)
  assert.deepEqual(trajectory.getPosition(-10), { x: 10, y: 100 })
  assert.deepEqual(trajectory.getPosition(900), { x: 110, y: 80 })
})

test('returns identical positions for identical inputs', () => {
  assert.deepEqual(trajectory.getPosition(246.5), trajectory.getPosition(246.5))
})

test('rim bounce trajectories begin by moving upward and outward', () => {
  const frontBounce = new BallTrajectory({ startX: 934, startY: 300, targetX: 892, targetY: 256, duration: 190, controlX: 896, controlY: 202 })
  const backBounce = new BallTrajectory({ startX: 1026, startY: 300, targetX: 1069, targetY: 256, duration: 190, controlX: 1064, controlY: 202 })
  const leftBounce = new BallTrajectory({ startX: 950, startY: 297, targetX: 900, targetY: 262, duration: 190, controlX: 910, controlY: 219 })
  const rightBounce = new BallTrajectory({ startX: 1010, startY: 297, targetX: 1060, targetY: 262, duration: 190, controlX: 1050, controlY: 219 })

  assert.ok(frontBounce.getPosition(80).y < 300)
  assert.ok(backBounce.getPosition(80).y < 300)
  assert.ok(leftBounce.getPosition(80).x < 950)
  assert.ok(rightBounce.getPosition(80).x > 1010)
})
