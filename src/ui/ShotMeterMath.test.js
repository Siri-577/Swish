import assert from 'node:assert/strict'
import test from 'node:test'
import { getGreenZone, getMeterProgress, getMeterScreenPosition, isVisualProgressInGreenZone, isWholeMeterGreen } from './ShotMeterMath.js'

test('meter progress maps timing to a clamped bottom-up fill', () => {
  assert.equal(getMeterProgress(0, 800), 0)
  assert.equal(getMeterProgress(400, 800), 0.5)
  assert.equal(getMeterProgress(500, 800), 0.625)
  assert.equal(getMeterProgress(800, 800), 1)
  assert.equal(getMeterProgress(1000, 800), 1)
})

test('visual target is in the top region while the green zone touches the meter top', () => {
  const profile = { targetReleaseMs: 500, meterRiseDurationMs: 540, greenWindowMs: 40 }
  const zone = getGreenZone(profile)
  assert.ok(Math.abs(zone.bottomPercent - 85.18519) < 0.00001)
  assert.ok(Math.abs(zone.heightPercent - 14.81481) < 0.00001)
  assert.equal(zone.bottomPercent + zone.heightPercent, 100)
  assert.equal(isVisualProgressInGreenZone(zone.bottomPercent / 100, profile), true)
  assert.equal(isVisualProgressInGreenZone(1, profile), true)
})

test('green zone visual height follows the configured green window', () => {
  const small = getGreenZone({ targetReleaseMs: 500, meterRiseDurationMs: 540, greenWindowMs: 25 })
  const large = getGreenZone({ targetReleaseMs: 500, meterRiseDurationMs: 540, greenWindowMs: 40 })
  assert.ok(large.heightPercent > small.heightPercent)
  assert.equal(small.bottomPercent + small.heightPercent, 100)
  assert.equal(large.bottomPercent + large.heightPercent, 100)
})

test('meter screen position is offset from the projected player anchor', () => {
  assert.deepEqual(getMeterScreenPosition({ x: 600, y: 400 }, { x: 58, y: 48 }), { left: 658, top: 352 })
})

test('green window changes do not affect meter positioning', () => {
  const position = getMeterScreenPosition({ x: 600, y: 400 }, { x: 58, y: 48 })
  getGreenZone({ targetReleaseMs: 500, greenWindowMs: 20 })
  getGreenZone({ targetReleaseMs: 500, greenWindowMs: 30 })
  assert.deepEqual(position, { left: 658, top: 352 })
})

test('only a green release activates the whole-meter green state', () => {
  assert.equal(isWholeMeterGreen({ isGreen: true }, 'BALL_IN_FLIGHT'), true)
  assert.equal(isWholeMeterGreen({ isGreen: false }, 'BALL_IN_FLIGHT'), false)
  assert.equal(isWholeMeterGreen({ isGreen: true }, 'HOLDING'), false)
})
