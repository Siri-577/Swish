function toPlainPosition(position) {
  return { x: position.x, y: position.y, z: position.z }
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180
}

function buildSolution({ releasePosition, targetPosition, gravity, horizontalDistance, heightDifference, launchVelocity, flightDurationMs }) {
  const horizontalSpeed = Math.hypot(launchVelocity.x, launchVelocity.z)
  const launchSpeed = Math.hypot(horizontalSpeed, launchVelocity.y)
  const flightSeconds = flightDurationMs / 1000
  const rimArrivalVelocity = {
    x: launchVelocity.x,
    y: launchVelocity.y - gravity * flightSeconds,
    z: launchVelocity.z,
  }
  return {
    targetPosition: toPlainPosition(targetPosition),
    horizontalDistance,
    heightDifference,
    launchAngleDegrees: Math.atan2(launchVelocity.y, horizontalSpeed) * 180 / Math.PI,
    entryAngleDegrees: Math.atan2(Math.abs(rimArrivalVelocity.y), horizontalSpeed) * 180 / Math.PI,
    launchSpeed,
    flightDurationMs,
    launchVelocity,
    apexHeight: releasePosition.y + (launchVelocity.y * launchVelocity.y) / (2 * gravity),
    rimArrivalVelocity,
  }
}

// Physical angle baseline: derives the unscaled time that reaches the target.
export function solveBallisticShotByAngle({ releasePosition, targetPosition, launchAngleDegrees, gravity }) {
  const dx = targetPosition.x - releasePosition.x
  const dz = targetPosition.z - releasePosition.z
  const horizontalDistance = Math.hypot(dx, dz)
  const heightDifference = targetPosition.y - releasePosition.y
  const launchAngleRadians = degreesToRadians(launchAngleDegrees)
  const cosine = Math.cos(launchAngleRadians)
  const denominator = 2 * cosine * cosine * (horizontalDistance * Math.tan(launchAngleRadians) - heightDifference)
  if (horizontalDistance <= 0 || gravity <= 0 || denominator <= 0) {
    throw new Error('Ballistic shot requires a reachable target and valid launch angle')
  }
  const launchSpeed = Math.sqrt((gravity * horizontalDistance * horizontalDistance) / denominator)
  const horizontalSpeed = launchSpeed * cosine
  const launchVelocity = {
    x: dx / horizontalDistance * horizontalSpeed,
    y: launchSpeed * Math.sin(launchAngleRadians),
    z: dz / horizontalDistance * horizontalSpeed,
  }
  const flightDurationMs = horizontalDistance / horizontalSpeed * 1000
  return buildSolution({ releasePosition, targetPosition, gravity, horizontalDistance, heightDifference, launchVelocity, flightDurationMs })
}

// Gameplay time solver: keeps the same target and gravity while deriving the
// initial velocity required to arrive in the requested (shorter) time.
export function solveBallisticShotByFlightTime({ releasePosition, targetPosition, flightDurationMs, gravity }) {
  const dx = targetPosition.x - releasePosition.x
  const dz = targetPosition.z - releasePosition.z
  const horizontalDistance = Math.hypot(dx, dz)
  const heightDifference = targetPosition.y - releasePosition.y
  if (horizontalDistance <= 0 || gravity <= 0 || flightDurationMs <= 0) {
    throw new Error('Ballistic shot requires a reachable target, gravity, and positive flight time')
  }
  const seconds = flightDurationMs / 1000
  const horizontalSpeed = horizontalDistance / seconds
  const launchVelocity = {
    x: dx / horizontalDistance * horizontalSpeed,
    y: (heightDifference + 0.5 * gravity * seconds * seconds) / seconds,
    z: dz / horizontalDistance * horizontalSpeed,
  }
  return buildSolution({ releasePosition, targetPosition, gravity, horizontalDistance, heightDifference, launchVelocity, flightDurationMs })
}

export function createBaseShotSolution({ releasePosition, rimCenter, gravity, launchAngleDegrees, gameplayFlightTimeScale = 1 }) {
  const physicalBaseline = solveBallisticShotByAngle({ releasePosition, targetPosition: rimCenter, launchAngleDegrees, gravity })
  const gameplayFlightDurationMs = physicalBaseline.flightDurationMs * gameplayFlightTimeScale
  const launch = solveBallisticShotByFlightTime({ releasePosition, targetPosition: rimCenter, flightDurationMs: gameplayFlightDurationMs, gravity })
  return {
    releasePosition: toPlainPosition(releasePosition),
    targetPosition: toPlainPosition(rimCenter),
    physicalFlightDurationMs: physicalBaseline.flightDurationMs,
    baseFlightDurationMs: launch.flightDurationMs,
    baseLaunchVelocity: launch.launchVelocity,
    baseApexHeight: launch.apexHeight,
    baseLaunchAngleDegrees: launch.launchAngleDegrees,
    baseEntryAngleDegrees: launch.entryAngleDegrees,
    baseRimArrivalVelocity: launch.rimArrivalVelocity,
    horizontalDistance: launch.horizontalDistance,
  }
}

export function applyShotVariation(baseSolution, { targetPosition, launchAngleVariationDegrees = 0, gravity }) {
  // Keep Miss timing visually aligned with Green. Angle variation is allowed
  // only to make a sub-percent timing adjustment, never a slow miss branch.
  const variationScale = 1 + launchAngleVariationDegrees * 0.002
  return solveBallisticShotByFlightTime({
    releasePosition: baseSolution.releasePosition,
    targetPosition,
    flightDurationMs: baseSolution.baseFlightDurationMs * variationScale,
    gravity,
  })
}
