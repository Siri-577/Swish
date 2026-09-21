// Skill prototype only; it is not a real-player attribute model or likeness.
export const PAUL_GEORGE_PROTOTYPE_PROFILE = {
  targetReleaseMs: 500,
  greenWindowMs: 40,
  // The top is the inclusive end of the 460–540ms green interval.
  meterRiseDurationMs: 540,
  meterReturnDurationMs: 460,
  ballFlightDurationMs: 700,
  // Absolute world-space apex, not an offset from the release point.
  apexHeight: 5.25,
  releaseHeightOffset: 0,
  rotationRadiansPerMs: 0.014,
}

export const DEFAULT_SHOT_PROFILE = PAUL_GEORGE_PROTOTYPE_PROFILE
