import assert from 'node:assert/strict'
import test from 'node:test'
import { ShotOutcomeResolver } from './ShotOutcomeResolver.js'

const hoop = { x: 980, y: 300, rimWidth: 92 }

test('maps green to deterministic swish without a rim bounce', () => {
  assert.deepEqual(ShotOutcomeResolver.resolve({ isGreen: true, result: 'GREEN' }, hoop), {
    type: 'SWISH', missType: null, hasBounce: false,
  })
})

test('maps slightly early and late to front and back rim contacts', () => {
  const front = ShotOutcomeResolver.resolve({ isGreen: false, result: 'SLIGHTLY EARLY' }, hoop)
  const back = ShotOutcomeResolver.resolve({ isGreen: false, result: 'SLIGHTLY LATE' }, hoop)
  assert.equal(front.missType, 'FRONT_RIM')
  assert.equal(front.contactPoint.x, 934)
  assert.equal(front.hasBounce, true)
  assert.equal(back.missType, 'BACK_RIM')
  assert.equal(back.contactPoint.x, 1026)
  assert.equal(back.hasBounce, true)
})

test('maps early and late to side rims and extreme timing to clean misses', () => {
  assert.equal(ShotOutcomeResolver.resolve({ isGreen: false, result: 'EARLY' }, hoop).missType, 'LEFT_RIM')
  assert.equal(ShotOutcomeResolver.resolve({ isGreen: false, result: 'LATE' }, hoop).missType, 'RIGHT_RIM')
  const cleanMiss = ShotOutcomeResolver.resolve({ isGreen: false, result: 'VERY EARLY' }, hoop)
  assert.equal(cleanMiss.missType, 'CLEAN_MISS')
  assert.equal(cleanMiss.hasBounce, false)
})
