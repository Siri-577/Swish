import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyRimContact } from './RimContact.js'

test('classifies independent front, back, left, and right rim regions', () => {
  const center = { x: 0, z: 5.8 }
  assert.equal(classifyRimContact({ x: 0, z: 5.5 }, center), 'FRONT_RIM')
  assert.equal(classifyRimContact({ x: 0, z: 6.1 }, center), 'BACK_RIM')
  assert.equal(classifyRimContact({ x: -0.3, z: 5.8 }, center), 'LEFT_RIM')
  assert.equal(classifyRimContact({ x: 0.3, z: 5.8 }, center), 'RIGHT_RIM')
})
