import assert from 'node:assert/strict'
import test from 'node:test'
import { applyShotVariation, createBaseShotSolution, solveBallisticShotByAngle, solveBallisticShotByFlightTime } from './BaseShotSolution.js'

const releasePosition = { x: 0, y: 2.2, z: 0 }
const rimCenter = { x: 0, y: 3.048, z: 7.24 }
const gravity = 9.81

function reachesTarget(solution) {
  const seconds = solution.flightDurationMs / 1000
  const y = releasePosition.y + solution.launchVelocity.y * seconds - 0.5 * gravity * seconds * seconds
  return Math.abs(y - rimCenter.y) < 0.000001
}

test('physical angle baseline is reproducible and reaches the target height', () => {
  const input = { releasePosition, targetPosition: rimCenter, launchAngleDegrees: 51, gravity }
  const one = solveBallisticShotByAngle(input)
  assert.deepEqual(one, solveBallisticShotByAngle(input))
  assert.ok(reachesTarget(one))
  assert.equal(one.launchAngleDegrees, 51)
})

test('time-of-flight solver reaches the unchanged target with derived velocity', () => {
  const solution = solveBallisticShotByFlightTime({ releasePosition, targetPosition: rimCenter, flightDurationMs: 1100, gravity })
  assert.ok(reachesTarget(solution))
  assert.equal(solution.flightDurationMs, 1100)
})

test('shorter gameplay scales reduce arrival time and increase launch speed', () => {
  const physical = solveBallisticShotByAngle({ releasePosition, targetPosition: rimCenter, launchAngleDegrees: 51, gravity })
  const scale92 = createBaseShotSolution({ releasePosition, rimCenter, gravity, launchAngleDegrees: 51, gameplayFlightTimeScale: 0.92 })
  const scale88 = createBaseShotSolution({ releasePosition, rimCenter, gravity, launchAngleDegrees: 51, gameplayFlightTimeScale: 0.88 })
  const scale84 = createBaseShotSolution({ releasePosition, rimCenter, gravity, launchAngleDegrees: 51, gameplayFlightTimeScale: 0.84 })

  assert.equal(scale88.physicalFlightDurationMs, physical.flightDurationMs)
  assert.ok(scale92.baseFlightDurationMs > scale88.baseFlightDurationMs)
  assert.ok(scale88.baseFlightDurationMs > scale84.baseFlightDurationMs)
  assert.ok(Math.hypot(...Object.values(scale92.baseLaunchVelocity)) < Math.hypot(...Object.values(scale88.baseLaunchVelocity)))
  assert.ok(Math.hypot(...Object.values(scale88.baseLaunchVelocity)) < Math.hypot(...Object.values(scale84.baseLaunchVelocity)))
})

test('miss variation stays within a sub-percent timing adjustment on the shared solver', () => {
  const base = createBaseShotSolution({ releasePosition, rimCenter, gravity, launchAngleDegrees: 51, gameplayFlightTimeScale: 0.88 })
  const miss = applyShotVariation(base, { targetPosition: { x: 0.15, y: 3.048, z: 7.1 }, launchAngleVariationDegrees: 0.5, gravity })
  assert.ok(Math.abs(miss.flightDurationMs - base.baseFlightDurationMs) < base.baseFlightDurationMs * 0.01)
  assert.ok(miss.launchSpeed > 0)
})
