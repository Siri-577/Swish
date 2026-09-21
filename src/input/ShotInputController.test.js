import assert from 'node:assert/strict'
import test from 'node:test'
import { InputTiming } from '../core/InputTiming.js'
import { ShotInputController } from './ShotInputController.js'

function createController() {
  let time = 1000
  const releases = []
  const controller = new ShotInputController({
    inputTiming: new InputTiming({ now: () => time }),
    onRelease: (duration, source) => releases.push({ duration, source }),
  })
  return { controller, releases, setTime: (value) => { time = value } }
}

test('starts one keyboard shot and ignores repeated keyboard press', () => {
  const { controller } = createController()
  assert.equal(controller.press('keyboard'), true)
  assert.equal(controller.press('keyboard'), false)
  assert.equal(controller.activeInputSource, 'keyboard')
})

test('prevents pointer and keyboard input conflicts', () => {
  const { controller } = createController()
  controller.press('keyboard')
  assert.equal(controller.press('pointer', 4), false)
  controller.cancel()
  controller.press('pointer', 4)
  assert.equal(controller.press('keyboard'), false)
})

test('only the active pointer can release a pointer shot', () => {
  const { controller, releases, setTime } = createController()
  controller.press('pointer', 4)
  setTime(1500)
  assert.equal(controller.release('pointer', 8), null)
  assert.equal(controller.release('pointer', 4), 500)
  assert.deepEqual(releases, [{ duration: 500, source: 'pointer' }])
  assert.equal(controller.activePointerId, null)
})

test('releases an active pointer regardless of where the global pointerup originated', () => {
  const { controller, releases, setTime } = createController()
  controller.press('pointer', 4)
  setTime(1250)

  assert.equal(controller.release('pointer', 4), 250)
  assert.deepEqual(releases, [{ duration: 250, source: 'pointer' }])
})

test('ignores a duplicate global pointerup after the first release', () => {
  const { controller, releases, setTime } = createController()
  controller.press('pointer', 4)
  setTime(1250)
  controller.release('pointer', 4)

  assert.equal(controller.release('pointer', 4), null)
  assert.equal(releases.length, 1)
})

test('cancel clears state without producing a release', () => {
  const { controller, releases } = createController()
  controller.press('pointer', 4)
  assert.equal(controller.cancel('pointer', 4), true)
  assert.equal(controller.activeInputSource, null)
  assert.equal(controller.activePointerId, null)
  assert.equal(controller.inputTiming.isPressed, false)
  assert.deepEqual(releases, [])
})

test('state fail-safe resets an impossible pressed state', () => {
  const { controller } = createController()
  controller.inputTiming.press()

  assert.equal(controller.ensureConsistentState(), false)
  assert.equal(controller.inputTiming.isPressed, false)
  assert.equal(controller.activePointerId, null)
})

test('blur-equivalent cancel clears an active keyboard source', () => {
  const { controller } = createController()
  controller.press('keyboard')
  controller.cancel()
  assert.equal(controller.activeInputSource, null)
})

test('a named shoot button source retains its active pointer identity', () => {
  const { controller, setTime } = createController()
  controller.press('SHOOT_BUTTON', 12)
  setTime(1400)
  assert.equal(controller.release('SHOOT_BUTTON', 13), null)
  assert.equal(controller.release('SHOOT_BUTTON', 12), 400)
})

test('a shoot button source cancels only for its matching pointer', () => {
  const { controller } = createController()
  controller.press('SHOOT_BUTTON', 7)
  assert.equal(controller.cancel('SHOOT_BUTTON', 8), false)
  assert.equal(controller.activePointerId, 7)
  assert.equal(controller.cancel('SHOOT_BUTTON', 7), true)
  assert.equal(controller.activePointerId, null)
})
