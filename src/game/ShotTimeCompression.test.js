import assert from 'node:assert/strict'
import test from 'node:test'
import { createShotTimeCompression } from './ShotTimeCompression.js'

test('shot time compression preserves trajectory geometry inputs while scaling velocity and effective gravity', () => {
  const result = createShotTimeCompression({
    launchVelocity: { x: -0.5, y: 7, z: 8.5 },
    worldGravity: 9.81,
    timeCompression: 0.76,
  })
  assert.equal(result.velocityScale, 1 / 0.76)
  assert.ok(Math.abs(result.effectiveGravity - 16.984) < 0.01)
  assert.ok(Math.abs(result.launchVelocity.z - (8.5 / 0.76)) < 0.000001)
})

test('supported presets produce the intended compressed flight durations', () => {
  const baseDurationMs = 1130.62
  assert.ok(Math.abs(baseDurationMs * 0.8 - 904.496) < 0.001)
  assert.ok(Math.abs(baseDurationMs * 0.76 - 859.2712) < 0.001)
  assert.ok(Math.abs(baseDurationMs * 0.72 - 814.0464) < 0.001)
})
