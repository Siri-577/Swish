import assert from 'node:assert/strict'
import test from 'node:test'
import { ShotOutcomeSystem, createShotRandom } from './ShotOutcomeSystem.js'
import { createShotResultRecord, recordRimContact } from './ShotResultRecord.js'

const greenWindow = { centerMs: 500 }
const timing = (result, heldDuration, isGreen = false) => ({ result, heldDuration, isGreen })

test('green carries no miss deviation', () => {
  const outcome = ShotOutcomeSystem.resolve({ timingResult: timing('GREEN', 500, true), greenWindow })
  assert.deepEqual(outcome, { timingError: 0, isGreen: true, horizontalError: 0, depthError: 0, arcError: 0, targetPosition: null })
})

test('early is short, late is long, and bounded randomness is reproducible', () => {
  const values = [0.2, 0.5, 0.8, 0.1, 0.4, 0.9]
  let index = 0
  const random = createShotRandom(() => values[index++ % values.length])
  const early = ShotOutcomeSystem.resolve({ timingResult: timing('EARLY', 400), greenWindow, random })
  index = 0
  const repeated = ShotOutcomeSystem.resolve({ timingResult: timing('EARLY', 400), greenWindow, random: createShotRandom(() => values[index++ % values.length]) })
  const late = ShotOutcomeSystem.resolve({ timingResult: timing('LATE', 600), greenWindow, random: () => 0.5 })
  assert.ok(early.depthError < 0)
  assert.ok(late.depthError > 0)
  assert.deepEqual(early, repeated)
  assert.ok(Math.abs(early.horizontalError) <= 0.17)
  assert.ok(Math.abs(early.depthError) <= 0.34 + 0.11)
  assert.ok(Math.abs(early.arcError) <= 1)
  assert.equal(early.launchAngleVariationDegrees, early.arcError)
})

test('slightly early varies less than very early', () => {
  const near = ShotOutcomeSystem.resolve({ timingResult: timing('SLIGHTLY EARLY', 450), greenWindow, random: () => 1 })
  const far = ShotOutcomeSystem.resolve({ timingResult: timing('VERY EARLY', 250), greenWindow, random: () => 1 })
  assert.ok(Math.abs(near.depthError) < Math.abs(far.depthError))
  assert.ok(Math.abs(near.horizontalError) < Math.abs(far.horizontalError))
})

test('sampled early and late errors retain opposite depth tendencies', () => {
  const samples = Array.from({ length: 20 }, (_, index) => (index + 1) / 21)
  const averageDepth = (grade, heldDuration) => samples
    .map((value) => ShotOutcomeSystem.resolve({ timingResult: timing(grade, heldDuration), greenWindow, random: () => value }).depthError)
    .reduce((sum, value) => sum + value, 0) / samples.length
  assert.ok(averageDepth('EARLY', 400) < 0)
  assert.ok(averageDepth('LATE', 600) > 0)
})

test('each bounded variation changes the actual physics target and continuous timing error changes the depth bias', () => {
  const common = {
    greenWindow,
    rimCenter: { x: 0, y: 3.048, z: 5.8 },
    shotDirection: { x: 0, z: 9.8 },
  }
  const leftShort = ShotOutcomeSystem.resolve({ ...common, timingResult: timing('EARLY', 400), random: () => 0 })
  const rightShort = ShotOutcomeSystem.resolve({ ...common, timingResult: timing('EARLY', 400), random: () => 1 })
  const closerEarly = ShotOutcomeSystem.resolve({ ...common, timingResult: timing('EARLY', 430), random: () => 0.5 })
  assert.notDeepEqual(leftShort.targetPosition, rightShort.targetPosition)
  assert.notEqual(leftShort.horizontalError, rightShort.horizontalError)
  assert.ok(leftShort.depthError < closerEarly.depthError)
})

test('rim result records every contact while preserving the first', () => {
  const result = createShotResultRecord({ timingError: -50, horizontalError: 0, depthError: -0.05, arcError: 0, isGreen: false })
  recordRimContact(result, 'FRONT_RIM')
  recordRimContact(result, 'BACK_RIM')
  assert.equal(result.rimContactCount, 2)
  assert.equal(result.firstRimContact, 'FRONT_RIM')
})
