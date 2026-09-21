const missDistanceByResult = {
  'SLIGHTLY EARLY': 0.65,
  EARLY: 1.2,
  'VERY EARLY': 2,
  'SLIGHTLY LATE': 0.65,
  LATE: 1.2,
  'VERY LATE': 2,
}

export const ShotTargetResolver3D = {
  resolve(timingResult, rimCenter) {
    if (timingResult.isGreen) {
      return { outcome: 'MAKE', targetPosition: { x: rimCenter.x, y: rimCenter.y - 0.45, z: rimCenter.z } }
    }

    const isEarly = timingResult.errorMs < 0
    const distance = missDistanceByResult[timingResult.result]
    return {
      outcome: 'MISS',
      targetPosition: {
        x: rimCenter.x + (isEarly ? -0.22 : 0.22),
        y: 0.55,
        z: rimCenter.z + (isEarly ? -distance : distance),
      },
    }
  },
}
