import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from '@babylonjs/core'
import { createBaseShotSolution } from './BaseShotSolution.js'
import { formatVector, isFiniteVector, toPlainVector, vectorLength } from './ShotFlightController3D.js'

test('formatVector safely rejects absent or incomplete vector data', () => {
  assert.equal(formatVector(undefined), '--')
  assert.equal(formatVector(null), '--')
  assert.equal(formatVector({}), '--')
  assert.equal(formatVector({ x: undefined, y: 1, z: 2 }), '--')
  assert.equal(vectorLength({}), null)
})

test('formatVector formats finite vector components', () => {
  assert.equal(formatVector({ x: 1, y: 2, z: 3 }), '(1.000, 2.000, 3.000)')
  assert.ok(Math.abs(vectorLength({ x: 1, y: 2, z: 3 }) - Math.sqrt(14)) < 1e-12)
})

test('green rim target is stored as finite plain x/y/z data', () => {
  const rimCenter = new Vector3(0.2, 3.048, 7.1)
  const targetPosition = toPlainVector(rimCenter)
  const solution = createBaseShotSolution({
    releasePosition: { x: 0, y: 2.1, z: 0 },
    rimCenter,
    gravity: 9.81,
    launchAngleDegrees: 51,
  })

  assert.deepEqual(targetPosition, { x: 0.2, y: 3.048, z: 7.1 })
  assert.equal(isFiniteVector(targetPosition), true)
  assert.equal(isFiniteVector(solution.targetPosition), true)
})
