// This establishes the currently accepted shot geometry before the separate
// shot-only time-compression pass accelerates it.
export const GAMEPLAY_FLIGHT_TIME_SCALE = 0.88
// Compresses the already-solved shot trajectory without changing its spatial
// parabola. World gravity remains 9.81 m/s²; the extra gravity is applied to
// the basketball only while its primary shot flight is active.
export const SHOT_TIME_COMPRESSION = 0.76

// Skill prototype only; it is not a real-player attribute model or likeness.
export const PAUL_GEORGE_PROTOTYPE_PROFILE = {
  targetReleaseMs: 500,
  greenWindowMs: 40,
  // The top is the inclusive end of the 460–540ms green interval.
  meterRiseDurationMs: 540,
  meterReturnDurationMs: 460,
  // Metres above the floor; future player profiles may override this value.
  releaseHeight: 2.2,
  releaseHeightOffset: 0,
  // The ballistic solver derives speed, flight time, and apex from this angle.
  baseLaunchAngleDegrees: 51,
  gameplayFlightTimeScale: GAMEPLAY_FLIGHT_TIME_SCALE,
  shotTimeCompression: SHOT_TIME_COMPRESSION,
  rotationRadiansPerMs: 0.014,
}

export const DEFAULT_SHOT_PROFILE = PAUL_GEORGE_PROTOTYPE_PROFILE
