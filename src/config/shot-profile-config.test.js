import assert from 'node:assert/strict'
import test from 'node:test'
import { PAUL_GEORGE_PROTOTYPE_PROFILE } from './shot-profile-config.js'

test('high-skill shooter prototype keeps meter timing independent from ballistic flight timing', () => {
  assert.equal(PAUL_GEORGE_PROTOTYPE_PROFILE.greenWindowMs, 40)
  assert.deepEqual(
    [PAUL_GEORGE_PROTOTYPE_PROFILE.meterRiseDurationMs, PAUL_GEORGE_PROTOTYPE_PROFILE.meterReturnDurationMs],
    [540, 460],
  )
})
