import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NET_BOTTOM_HORIZONTAL_STIFFNESS,
  NET_CONSTRAINT_ITERATIONS,
  NET_DIAGONAL_STIFFNESS,
  NET_MIDDLE_HORIZONTAL_STIFFNESS,
  NET_UPPER_HORIZONTAL_STIFFNESS,
  NET_VERTICAL_STIFFNESS,
  VERLET_DAMPING,
  calculateImpactMagnitude,
  calculateNodeInfluence,
} from './DynamicNetVisual.js'

test('net entry impact is bounded and rim makes carry a smaller visual impulse', () => {
  const cleanImpact = calculateImpactMagnitude({ horizontalSpeed: 8, verticalSpeed: -5, makeType: 'CLEAN' })
  const rimImpact = calculateImpactMagnitude({ horizontalSpeed: 8, verticalSpeed: -5, makeType: 'RIM' })
  assert.ok(cleanImpact > rimImpact)
  assert.ok(cleanImpact <= 1.8)
  assert.ok(calculateImpactMagnitude({ horizontalSpeed: 100, verticalSpeed: -100 }) <= 1.8)
})

test('net node influence is strongest near the entry and reaches zero outside its radius', () => {
  assert.equal(calculateNodeInfluence(0, 0.3), 1)
  assert.equal(calculateNodeInfluence(0.3, 0.3), 0)
  assert.equal(calculateNodeInfluence(0.15, 0.3), 0.5)
})

test('constraint net keeps its vertical structure firm while allowing the bottom opening to spread', () => {
  assert.equal(NET_CONSTRAINT_ITERATIONS, 4)
  assert.ok(NET_VERTICAL_STIFFNESS > NET_UPPER_HORIZONTAL_STIFFNESS)
  assert.ok(NET_UPPER_HORIZONTAL_STIFFNESS > NET_MIDDLE_HORIZONTAL_STIFFNESS)
  assert.ok(NET_MIDDLE_HORIZONTAL_STIFFNESS > NET_BOTTOM_HORIZONTAL_STIFFNESS)
  assert.ok(NET_DIAGONAL_STIFFNESS < NET_MIDDLE_HORIZONTAL_STIFFNESS)
  assert.ok(VERLET_DAMPING > 0.96 && VERLET_DAMPING < 0.99)
})
