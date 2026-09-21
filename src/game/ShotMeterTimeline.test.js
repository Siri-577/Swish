import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveShotMeterRelease, shouldIgnoreKeyboardRelease } from './ShotMeterRelease.js'
import { getShotMeterTimeline, SHOT_METER_PHASE } from './ShotMeterTimeline.js'
import { getGreenWindow } from './GreenWindow.js'
import { getGreenZone, isVisualGreenReleaseCandidate, isVisualProgressInGreenZone } from '../ui/ShotMeterMath.js'

const profile = {
  targetReleaseMs: 500,
  greenWindowMs: 40,
  meterRiseDurationMs: 540,
  meterReturnDurationMs: 460,
}
const windows = { greenMs: 25, slightlyMs: 75, earlyMs: 150 }

test('meter timeline rises, descends, and forces release at the bottom', () => {
  assert.deepEqual(getShotMeterTimeline(0, profile), { phase: SHOT_METER_PHASE.ASCENDING, progress: 0, shouldForceRelease: false })
  assert.deepEqual(getShotMeterTimeline(270, profile), { phase: SHOT_METER_PHASE.ASCENDING, progress: 0.5, shouldForceRelease: false })
  assert.deepEqual(getShotMeterTimeline(540, profile), { phase: SHOT_METER_PHASE.ASCENDING, progress: 1, shouldForceRelease: false })
  assert.deepEqual(getShotMeterTimeline(770, profile), { phase: SHOT_METER_PHASE.DESCENDING, progress: 0.5, shouldForceRelease: false })
  assert.deepEqual(getShotMeterTimeline(1000, profile), { phase: SHOT_METER_PHASE.COMPLETE, progress: 0, shouldForceRelease: true })
})

test('every inclusive ascending green interval boundary is green', () => {
  for (const releaseMs of [460, 500, 540]) {
    const release = resolveShotMeterRelease({ heldDuration: releaseMs, profile, windows })
    assert.equal(release.result, 'GREEN')
    assert.equal(release.isGreen, true)
    assert.equal(release.meterPhase, SHOT_METER_PHASE.ASCENDING)
  }
})

test('every sampled logical green release is visually inside the same green zone', () => {
  const greenWindow = getGreenWindow(profile)
  const zone = getGreenZone(profile)
  assert.ok(Math.abs(zone.bottomPercent / 100 - greenWindow.startMs / greenWindow.endMs) < 0.000001)
  for (const releaseMs of [460, 470, 500, 520, 539.9, 540]) {
    const timeline = getShotMeterTimeline(releaseMs, profile)
    const release = resolveShotMeterRelease({ heldDuration: releaseMs, profile, windows })
    assert.equal(isVisualGreenReleaseCandidate(timeline, profile), true)
    assert.equal(release.result, 'GREEN')
  }
})

test('values just outside the interval and descending passes cannot be green', () => {
  const before = getShotMeterTimeline(459.9, profile)
  assert.equal(isVisualProgressInGreenZone(before.progress, profile), false)
  assert.notEqual(resolveShotMeterRelease({ heldDuration: 459.9, profile, windows }).result, 'GREEN')
  const descendingRelease = resolveShotMeterRelease({ heldDuration: 540.1, profile, windows })
  assert.equal(isVisualGreenReleaseCandidate(getShotMeterTimeline(540.1, profile), profile), false)
  assert.notEqual(descendingRelease.result, 'GREEN')
  assert.equal(descendingRelease.meterPhase, SHOT_METER_PHASE.DESCENDING)
})

test('forced release is very late and a later keyboard keyup is ignored', () => {
  const forced = resolveShotMeterRelease({ heldDuration: 1000, profile, windows, forced: true })
  assert.equal(forced.result, 'VERY LATE')
  assert.equal(forced.isGreen, false)
  assert.equal(shouldIgnoreKeyboardRelease('BALL_IN_FLIGHT'), true)
  assert.equal(shouldIgnoreKeyboardRelease('HOLDING'), false)
})
