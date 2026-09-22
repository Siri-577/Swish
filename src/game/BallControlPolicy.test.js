import assert from 'node:assert/strict'
import test from 'node:test'
import { canSyncHeldBall } from './BallControlPolicy.js'

test('held-ball synchronization is restricted to ready and holding states', () => {
  assert.equal(canSyncHeldBall('READY'), true)
  assert.equal(canSyncHeldBall('HOLDING'), true)
  assert.equal(canSyncHeldBall('BALL_IN_FLIGHT'), false)
  assert.equal(canSyncHeldBall('MADE'), false)
  assert.equal(canSyncHeldBall('POST_SHOT'), false)
  assert.equal(canSyncHeldBall('RESETTING'), false)
})
