import assert from 'node:assert/strict'
import test from 'node:test'
import { canStartShootPointer } from './ShootButtonOverlay.js'

test('shoot button accepts a first left mouse, touch, or pen pointer only', () => {
  assert.equal(canStartShootPointer({ pointerType: 'mouse', button: 0 }, null), true)
  assert.equal(canStartShootPointer({ pointerType: 'touch', button: 0 }, null), true)
  assert.equal(canStartShootPointer({ pointerType: 'pen', button: 0 }, null), true)
})

test('shoot button rejects non-left mouse buttons and additional active pointers', () => {
  assert.equal(canStartShootPointer({ pointerType: 'mouse', button: 1 }, null), false)
  assert.equal(canStartShootPointer({ pointerType: 'mouse', button: 2 }, null), false)
  assert.equal(canStartShootPointer({ pointerType: 'touch', button: 0 }, 8), false)
})
