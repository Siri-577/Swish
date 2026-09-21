import assert from 'node:assert/strict'
import test from 'node:test'
import { ShotTargetResolver3D } from './ShotTargetResolver3D.js'

const rimCenter = { x: 0, y: 3.05, z: 6.3 }

test('green uses the rim opening center and always makes', () => {
  const resolution = ShotTargetResolver3D.resolve({ isGreen: true, result: 'GREEN', errorMs: 0 }, rimCenter)
  assert.equal(resolution.outcome, 'MAKE')
  assert.equal(resolution.targetPosition.x, rimCenter.x)
  assert.equal(resolution.targetPosition.z, rimCenter.z)
})

test('early targets fall short while late targets travel long', () => {
  const early = ShotTargetResolver3D.resolve({ isGreen: false, result: 'EARLY', errorMs: -100 }, rimCenter)
  const late = ShotTargetResolver3D.resolve({ isGreen: false, result: 'LATE', errorMs: 100 }, rimCenter)
  assert.equal(early.outcome, 'MISS')
  assert.ok(early.targetPosition.z < rimCenter.z)
  assert.ok(late.targetPosition.z > rimCenter.z)
})
