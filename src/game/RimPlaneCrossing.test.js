import assert from 'node:assert/strict'
import test from 'node:test'
import { getSweptPlaneCrossing, getSweptRimPlaneCrossing } from './RimPlaneCrossing.js'

test('swept crossing returns the segment intersection at the rim plane', () => {
  const crossing = getSweptRimPlaneCrossing({
    previousPosition: { x: 0.1, y: 3.12, z: 5.68 },
    currentPosition: { x: -0.1, y: 2.96, z: 5.92 },
    rimCenter: { x: 0, y: 3.048, z: 5.8 },
  })
  assert.ok(crossing)
  assert.ok(Math.abs(crossing.t - 0.45) < 1e-12)
  assert.ok(Math.abs(crossing.position.x - 0.01) < 1e-12)
  assert.equal(crossing.position.y, 3.048)
  assert.ok(Math.abs(crossing.position.z - 5.788) < 1e-12)
  assert.ok(crossing.horizontalDistance < 0.02)
})

test('generic swept-plane crossing supports the net exit sensor', () => {
  const crossing = getSweptPlaneCrossing({
    previousPosition: { x: 0.03, y: 2.6, z: 5.78 },
    currentPosition: { x: 0.04, y: 2.5, z: 5.79 },
    planeY: 2.548,
    referencePosition: { x: 0, y: 3.048, z: 5.8 },
  })
  assert.ok(crossing)
  assert.ok(crossing.horizontalDistance < 0.05)
})

test('swept crossing rejects upward and non-crossing segments', () => {
  const rimCenter = { x: 0, y: 3.048, z: 5.8 }
  assert.equal(getSweptRimPlaneCrossing({
    previousPosition: { x: 0, y: 3, z: 5.8 }, currentPosition: { x: 0, y: 3.1, z: 5.8 }, rimCenter,
  }), null)
})
