const GRADE_VARIATION = {
  'SLIGHTLY EARLY': { horizontal: 0.075, depth: 0.045, arc: 0.5 },
  EARLY: { horizontal: 0.17, depth: 0.11, arc: 1 },
  'VERY EARLY': { horizontal: 0.28, depth: 0.2, arc: 1.5 },
  'SLIGHTLY LATE': { horizontal: 0.075, depth: 0.045, arc: 0.5 },
  LATE: { horizontal: 0.17, depth: 0.11, arc: 1 },
  'VERY LATE': { horizontal: 0.28, depth: 0.2, arc: 1.5 },
}

const TIMING_ERROR_SCALE_MS = 220
const MAX_DEPTH_BIAS = 0.34

export function createShotRandom(random = Math.random) {
  return () => Math.max(0, Math.min(1, random()))
}

function signedRandom(random) {
  return random() * 2 - 1
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

export class ShotOutcomeSystem {
  static resolve({ timingResult, greenWindow, rimCenter = null, shotContext = null, shootingProfile = null, shotDirection = null, random = createShotRandom() }) {
    const greenCenterMs = greenWindow.centerMs ?? ((greenWindow.startMs + greenWindow.endMs) / 2)
    const timingError = timingResult.heldDuration - greenCenterMs
    if (timingResult.isGreen) {
      return {
        timingError,
        isGreen: true,
        horizontalError: 0,
        depthError: 0,
        arcError: 0,
        targetPosition: null,
      }
    }

    const variation = GRADE_VARIATION[timingResult.result]
    if (!variation) throw new Error(`Unsupported non-green timing grade: ${timingResult.result}`)
    const distanceScale = clamp((shotContext?.distanceMeters ?? 8) / 8, 0.9, 1.15)
    const normalizedTimingError = clamp(timingError / TIMING_ERROR_SCALE_MS, -1, 1)
    const depthBias = normalizedTimingError * MAX_DEPTH_BIAS * distanceScale
    const horizontalError = signedRandom(random) * variation.horizontal * distanceScale
    const depthError = depthBias + signedRandom(random) * variation.depth * distanceScale
    const arcError = signedRandom(random) * variation.arc * distanceScale
    let targetPosition = null
    if (rimCenter && shotDirection) {
      const directionLength = Math.hypot(shotDirection.x, shotDirection.z) || 1
      const forwardX = shotDirection.x / directionLength
      const forwardZ = shotDirection.z / directionLength
      const rightX = -forwardZ
      const rightZ = forwardX
      targetPosition = {
        x: rimCenter.x + forwardX * depthError + rightX * horizontalError,
        y: rimCenter.y,
        z: rimCenter.z + forwardZ * depthError + rightZ * horizontalError,
      }
    }
    return {
      timingError,
      normalizedTimingError,
      isGreen: false,
      horizontalError,
      depthError,
      arcError,
      launchAngleVariationDegrees: arcError,
      targetPosition,
      shotDistance: shotContext?.distanceMeters ?? null,
      shotDirection,
      shootingProfile,
    }
  }
}

export const SHOT_OUTCOME_LIMITS = GRADE_VARIATION
