export const SHOT_METER_PHASE = {
  IDLE: 'IDLE',
  ASCENDING: 'ASCENDING',
  DESCENDING: 'DESCENDING',
  COMPLETE: 'COMPLETE',
}

export function getShotMeterTimeline(elapsedMs, { meterRiseDurationMs, meterReturnDurationMs }) {
  const elapsed = Math.max(0, elapsedMs)
  // The exact top remains part of the first, ascending pass so the green
  // interval's inclusive upper boundary can be released as GREEN.
  if (elapsed <= meterRiseDurationMs) {
    return { phase: SHOT_METER_PHASE.ASCENDING, progress: elapsed / meterRiseDurationMs, shouldForceRelease: false }
  }

  const returnElapsed = elapsed - meterRiseDurationMs
  if (returnElapsed < meterReturnDurationMs) {
    return {
      phase: SHOT_METER_PHASE.DESCENDING,
      progress: Math.max(0, 1 - returnElapsed / meterReturnDurationMs),
      shouldForceRelease: false,
    }
  }

  return { phase: SHOT_METER_PHASE.COMPLETE, progress: 0, shouldForceRelease: true }
}
