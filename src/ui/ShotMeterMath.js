export function getMeterProgress(heldDurationMs, meterDurationMs) {
  return Math.max(0, Math.min(heldDurationMs / meterDurationMs, 1))
}

export function getGreenZone({ targetReleaseMs, greenWindowMs, meterRiseDurationMs }) {
  const greenWindow = getGreenWindow({ targetReleaseMs, greenWindowMs })
  const bottomPercent = Math.max(0, (greenWindow.startMs / meterRiseDurationMs) * 100)
  return {
    bottomPercent,
    heightPercent: 100 - bottomPercent,
  }
}

export function isVisualProgressInGreenZone(progress, profile) {
  const zone = getGreenZone(profile)
  return progress >= zone.bottomPercent / 100 && progress <= 1
}

export function isVisualGreenReleaseCandidate(timeline, profile) {
  return timeline.phase === 'ASCENDING' && isVisualProgressInGreenZone(timeline.progress, profile)
}

export function isWholeMeterGreen(timingResult, state) {
  return state !== 'HOLDING' && timingResult?.isGreen === true
}

export function getMeterScreenPosition(playerScreenPosition, offset) {
  return {
    left: playerScreenPosition.x + offset.x,
    top: playerScreenPosition.y - offset.y,
  }
}
import { getGreenWindow } from '../game/GreenWindow.js'
