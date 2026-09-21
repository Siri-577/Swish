export const ShotOutcomeResolver = {
  resolve(timingResult, hoop) {
    if (timingResult.isGreen) return { type: 'SWISH', missType: null, hasBounce: false }

    const frontX = hoop.x - hoop.rimWidth / 2
    const backX = hoop.x + hoop.rimWidth / 2
    const rimMisses = {
      EARLY: { missType: 'LEFT_RIM', contactPoint: { x: frontX + 16, y: hoop.y - 3 }, bounceDirection: -1, bounceHeight: 78, horizontalOffset: 112 },
      'SLIGHTLY EARLY': { missType: 'FRONT_RIM', contactPoint: { x: frontX, y: hoop.y }, bounceDirection: -1, bounceHeight: 98, horizontalOffset: 92 },
      'SLIGHTLY LATE': { missType: 'BACK_RIM', contactPoint: { x: backX, y: hoop.y }, bounceDirection: 1, bounceHeight: 98, horizontalOffset: 96 },
      LATE: { missType: 'RIGHT_RIM', contactPoint: { x: backX - 16, y: hoop.y - 3 }, bounceDirection: 1, bounceHeight: 80, horizontalOffset: 118 },
    }

    if (rimMisses[timingResult.result]) {
      return { type: 'MISS', hasBounce: true, ...rimMisses[timingResult.result] }
    }

    const isShort = timingResult.result === 'VERY EARLY'
    return {
      type: 'MISS',
      missType: 'CLEAN_MISS',
      hasBounce: false,
      cleanTarget: { x: hoop.x + (isShort ? -145 : 150), y: hoop.y + 98 },
    }
  },
}
