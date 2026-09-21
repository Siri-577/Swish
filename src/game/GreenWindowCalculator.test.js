import assert from 'node:assert/strict'
import test from 'node:test'
import { PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE } from '../config/player-shooting-profiles.js'
import { DEFAULT_SHOT_PROFILE } from '../config/shot-profile-config.js'
import { calculateGreenWindow, createLockedShotProfile, GREEN_WINDOW_DIFFICULTY } from './GreenWindowCalculator.js'
import { createShotContext, SHOT_ZONE } from './ShotContext.js'
import { getGreenZone } from '../ui/ShotMeterMath.js'

const rimPosition = { x: 0, y: 3.048, z: 0 }
const closeContext = createShotContext({ playerPosition: { x: 0, y: 0, z: -4 }, rimPosition })
const farContext = createShotContext({ playerPosition: { x: 0, y: 0, z: -9 }, rimPosition })
const lowSkillProfile = { midRangeRating: 68, threePointRating: 65 }

test('higher shooting rating earns a wider green window at the same spot', () => {
  const high = calculateGreenWindow({ shootingProfile: PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE, shotContext: farContext, targetReleaseMs: 500 })
  const low = calculateGreenWindow({ shootingProfile: lowSkillProfile, shotContext: farContext, targetReleaseMs: 500 })
  assert.ok(high.greenWindowMs > low.greenWindowMs)
})

test('the same shooter receives a narrower window at longer distance', () => {
  const close = calculateGreenWindow({ shootingProfile: PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE, shotContext: closeContext, targetReleaseMs: 500 })
  const far = calculateGreenWindow({ shootingProfile: PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE, shotContext: farContext, targetReleaseMs: 500 })
  assert.ok(close.greenWindowMs > far.greenWindowMs)
})

test('mid-range and three-point zones select their respective ratings', () => {
  const mid = calculateGreenWindow({ shootingProfile: { midRangeRating: 95, threePointRating: 60 }, shotContext: { ...closeContext, shotZone: SHOT_ZONE.MID_RANGE }, targetReleaseMs: 500 })
  const three = calculateGreenWindow({ shootingProfile: { midRangeRating: 95, threePointRating: 60 }, shotContext: { ...farContext, shotZone: SHOT_ZONE.TOP_3 }, targetReleaseMs: 500 })
  assert.equal(mid.relevantShootingRating, 95)
  assert.equal(three.relevantShootingRating, 60)
})

test('window calculation respects configured minimum and maximum clamps', () => {
  const maximum = calculateGreenWindow({ shootingProfile: { midRangeRating: 200, threePointRating: 200 }, shotContext: closeContext, targetReleaseMs: 500 })
  const minimum = calculateGreenWindow({ shootingProfile: { midRangeRating: 0, threePointRating: 0 }, shotContext: farContext, targetReleaseMs: 500 })
  assert.equal(maximum.greenWindowMs, GREEN_WINDOW_DIFFICULTY.maximumGreenWindowMs)
  assert.equal(minimum.greenWindowMs, GREEN_WINDOW_DIFFICULTY.minimumGreenWindowMs)
})

test('a locked shot profile remains stable and drives the meter green zone', () => {
  const locked = createLockedShotProfile({ shotProfile: DEFAULT_SHOT_PROFILE, shootingProfile: PAUL_GEORGE_PROTOTYPE_SHOOTING_PROFILE, shotContext: closeContext })
  const zone = getGreenZone(locked)
  assert.equal(Object.isFrozen(locked), true)
  assert.equal(locked.meterRiseDurationMs, locked.greenEndMs)
  assert.equal(zone.bottomPercent / 100, locked.greenStartMs / locked.greenEndMs)
  const lockedWindowMs = locked.greenWindowMs
  calculateGreenWindow({ shootingProfile: lowSkillProfile, shotContext: farContext, targetReleaseMs: 500 })
  assert.equal(locked.greenWindowMs, lockedWindowMs)
})
