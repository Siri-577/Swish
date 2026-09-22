import assert from 'node:assert/strict'
import test from 'node:test'
import { predictRimPlaneCrossing } from './RimCrossingPrediction.js'

test('predicts a future descending crossing from the rim entry arm zone', () => {
  const crossing = predictRimPlaneCrossing({
    position: { x: 0.01, y: 3.248, z: 5.499 },
    velocity: { x: -0.3, y: -5, z: 8 },
    rimCenter: { x: 0, y: 3.048, z: 5.8 },
    gravity: 16.984,
  })
  assert.ok(crossing)
  assert.ok(crossing.timeSeconds > 0)
  assert.ok(crossing.timeSeconds < 0.05)
  assert.ok(crossing.horizontalDistance < 0.06)
})

test('rejects upward motion and invalid physics inputs', () => {
  const shared = {
    position: { x: 0, y: 3.2, z: 5.8 },
    rimCenter: { x: 0, y: 3.048, z: 5.8 },
    gravity: 9.81,
  }
  assert.equal(predictRimPlaneCrossing({ ...shared, velocity: { x: 0, y: 1, z: 7 } }), null)
  assert.equal(predictRimPlaneCrossing({ ...shared, velocity: { x: 0, y: -4, z: 7 }, gravity: 0 }), null)
})
