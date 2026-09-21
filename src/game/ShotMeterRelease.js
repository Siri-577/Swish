import { ShotTimingEngine } from './ShotTimingEngine.js'
import { getShotMeterTimeline, SHOT_METER_PHASE } from './ShotMeterTimeline.js'
import { getGreenWindow } from './GreenWindow.js'

export function resolveShotMeterRelease({ heldDuration, profile, windows, forced = false }) {
  const timeline = getShotMeterTimeline(heldDuration, profile)
  const greenWindow = getGreenWindow(profile)
  const evaluation = ShotTimingEngine.evaluate({
    heldDuration,
    targetReleaseMs: profile.targetReleaseMs,
    windows: { ...windows, greenMs: profile.greenWindowMs },
    greenWindow,
  })

  if (forced) return { ...evaluation, result: 'VERY LATE', isGreen: false, meterPhase: timeline.phase }
  if (timeline.phase !== SHOT_METER_PHASE.ASCENDING && evaluation.isGreen) {
    return { ...evaluation, result: 'SLIGHTLY LATE', isGreen: false, meterPhase: timeline.phase }
  }
  return { ...evaluation, meterPhase: timeline.phase }
}

export function shouldIgnoreKeyboardRelease(state) {
  return state !== 'HOLDING'
}
