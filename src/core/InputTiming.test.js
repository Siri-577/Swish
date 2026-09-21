import assert from 'node:assert/strict'
import test from 'node:test'
import { InputTiming } from './InputTiming.js'

test('records duration from one press and release', () => {
  let time = 1000
  const timing = new InputTiming({ now: () => time })
  timing.press()
  time = 1450
  assert.equal(timing.release(), 450)
})

test('does not reset the first press during repeated press calls', () => {
  let time = 1000
  const timing = new InputTiming({ now: () => time })
  timing.press()
  time = 1060
  assert.equal(timing.press(), false)
  time = 1450
  assert.equal(timing.release(), 450)
})

test('reset clears an active press and prevents a ghost release', () => {
  const timing = new InputTiming({ now: () => 1000 })
  timing.press()
  timing.reset()
  assert.equal(timing.isPressed, false)
  assert.equal(timing.release(), null)
})
