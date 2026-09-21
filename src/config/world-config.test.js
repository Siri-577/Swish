import assert from 'node:assert/strict'
import test from 'node:test'
import { BALL, HOOP, PLAYER, WORLD_CONFIG } from './world-config.js'

test('world configuration uses metre-scale basketball dimensions', () => {
  assert.equal(WORLD_CONFIG.metersPerUnit, 1)
  assert.equal(HOOP.y, 3.048)
  assert.equal(HOOP.rimInnerRadius, 0.235)
  assert.equal(BALL.radius, 0.12)
  assert.equal(PLAYER.height, 1.82)
})

test('static net configuration preserves the rim reference dimensions', () => {
  assert.equal(HOOP.netStrandCount, 8)
  assert.ok(HOOP.netHeight >= 0.35 && HOOP.netHeight <= 0.45)
  assert.equal(HOOP.rimInnerRadius, 0.235)
})
