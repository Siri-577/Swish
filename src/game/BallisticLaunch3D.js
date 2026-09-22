export function getBallisticLaunch({ startPosition, targetPosition, apexHeight, gravity = 9.81 }) {
  const rise = Math.max(0.01, apexHeight - startPosition.y)
  const verticalVelocity = Math.sqrt(2 * gravity * rise)
  const targetHeight = targetPosition.y - startPosition.y
  const discriminant = Math.max(0, verticalVelocity * verticalVelocity - 2 * gravity * targetHeight)
  const flightSeconds = (verticalVelocity + Math.sqrt(discriminant)) / gravity
  return {
    velocity: {
      x: (targetPosition.x - startPosition.x) / flightSeconds,
      y: verticalVelocity,
      z: (targetPosition.z - startPosition.z) / flightSeconds,
    },
    flightSeconds,
  }
}

export function getBallisticLaunchForDuration({ startPosition, targetPosition, durationMs, gravity = 9.81 }) {
  const durationSeconds = durationMs / 1000
  const targetHeight = targetPosition.y - startPosition.y
  return {
    velocity: {
      x: (targetPosition.x - startPosition.x) / durationSeconds,
      y: (targetHeight + 0.5 * gravity * durationSeconds * durationSeconds) / durationSeconds,
      z: (targetPosition.z - startPosition.z) / durationSeconds,
    },
    flightSeconds: durationSeconds,
  }
}
