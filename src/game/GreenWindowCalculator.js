import { getGreenWindow } from './GreenWindow.js'
import { SHOT_ZONE } from './ShotContext.js'

export const GREEN_WINDOW_DIFFICULTY = {
  baseGreenWindowMs: 34,
  ratingBaseline: 70,
  ratingMsPerPoint: 0.45,
  distancePenaltyStartMeters: 5.5,
  distancePenaltyMsPerMeter: 1.1,
  maximumDistancePenaltyMs: 9,
  minimumGreenWindowMs: 18,
  maximumGreenWindowMs: 45,
}

const THREE_POINT_ZONES = new Set([SHOT_ZONE.CORNER_3, SHOT_ZONE.WING_3, SHOT_ZONE.TOP_3, SHOT_ZONE.DEEP_3])

export function calculateGreenWindow({ shootingProfile, shotContext, targetReleaseMs, config = GREEN_WINDOW_DIFFICULTY }) {
  const relevantShootingRating = THREE_POINT_ZONES.has(shotContext.shotZone)
    ? shootingProfile.threePointRating
    : shootingProfile.midRangeRating
  const ratingAdjustment = (relevantShootingRating - config.ratingBaseline) * config.ratingMsPerPoint
  const distancePenalty = Math.min(
    Math.max(0, shotContext.distanceMeters - config.distancePenaltyStartMeters) * config.distancePenaltyMsPerMeter,
    config.maximumDistancePenaltyMs,
  )
  const unclampedGreenWindowMs = config.baseGreenWindowMs + ratingAdjustment - distancePenalty
  const greenWindowMs = Math.round(Math.min(config.maximumGreenWindowMs, Math.max(config.minimumGreenWindowMs, unclampedGreenWindowMs)) * 10) / 10
  const greenWindow = getGreenWindow({ targetReleaseMs, greenWindowMs })

  return { greenWindowMs, greenStartMs: greenWindow.startMs, greenEndMs: greenWindow.endMs, relevantShootingRating }
}

export function createLockedShotProfile({ shotProfile, shootingProfile, shotContext }) {
  const calculated = calculateGreenWindow({ shootingProfile, shotContext, targetReleaseMs: shotProfile.targetReleaseMs })
  return Object.freeze({
    ...shotProfile,
    greenWindowMs: calculated.greenWindowMs,
    meterRiseDurationMs: calculated.greenEndMs,
    greenStartMs: calculated.greenStartMs,
    greenEndMs: calculated.greenEndMs,
  })
}
