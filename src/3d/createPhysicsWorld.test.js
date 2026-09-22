import assert from 'node:assert/strict'
import test from 'node:test'
import { PhysicsMotionType } from '@babylonjs/core'
import { BALL_BODY_INITIAL_MOTION_TYPE, BALL_COLLIDE_MASK, COLLISION } from './createPhysicsWorld.js'

test('basketball physics body is created as permanently dynamic', () => {
  assert.equal(BALL_BODY_INITIAL_MOTION_TYPE, PhysicsMotionType.DYNAMIC)
})

test('basketball collision mask includes both world and rim colliders', () => {
  assert.equal(BALL_COLLIDE_MASK, COLLISION.WORLD | COLLISION.RIM)
})
