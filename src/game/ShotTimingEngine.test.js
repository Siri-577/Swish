import assert from 'node:assert/strict'
import test from 'node:test'
import { SHOT_TIMING_CONFIG } from '../config/shot-timing-config.js'
import { ShotTimingEngine } from './ShotTimingEngine.js'

function evaluate(heldDuration) {
  return ShotTimingEngine.evaluate({ heldDuration, ...SHOT_TIMING_CONFIG })
}

test('classifies every timing window boundary without gaps or overlap', () => {
  assert.equal(evaluate(500).result, 'GREEN')
  assert.equal(evaluate(475).result, 'GREEN')
  assert.equal(evaluate(525).result, 'GREEN')
  assert.equal(evaluate(474.9).result, 'SLIGHTLY EARLY')
  assert.equal(evaluate(525.1).result, 'SLIGHTLY LATE')
  assert.equal(evaluate(425).result, 'SLIGHTLY EARLY')
  assert.equal(evaluate(350).result, 'EARLY')
  assert.equal(evaluate(349.9).result, 'VERY EARLY')
  assert.equal(evaluate(650).result, 'LATE')
  assert.equal(evaluate(650.1).result, 'VERY LATE')
  assert.equal(evaluate(700).result, 'VERY LATE')
})

test('returns signed error and a perfect green result', () => {
  const result = evaluate(498.3)
  assert.equal(result.errorMs, -1.6999999999999886)
  assert.equal(result.absErrorMs, 1.6999999999999886)
  assert.equal(result.isGreen, true)
})

test('accepts a profile-specific green window without changing other timing logic', () => {
  const result = ShotTimingEngine.evaluate({
    heldDuration: 528,
    targetReleaseMs: 500,
    windows: { ...SHOT_TIMING_CONFIG.windows, greenMs: 30 },
  })
  assert.equal(result.result, 'GREEN')
})
