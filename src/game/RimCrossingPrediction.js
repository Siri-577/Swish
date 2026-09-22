function isFiniteVector(vector) {
  return Boolean(vector)
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z)
}

// Solves y(t) = rimY for a descending projectile. This is deliberately a
// future prediction from the ball's real position and velocity, rather than a
// current-position check at an arbitrary height above the rim.
export function predictRimPlaneCrossing({ position, velocity, rimCenter, gravity }) {
  if (!isFiniteVector(position) || !isFiniteVector(velocity) || !isFiniteVector(rimCenter)) return null
  if (!Number.isFinite(gravity) || gravity <= 0 || velocity.y >= 0 || position.y <= rimCenter.y) return null

  const heightAboveRim = position.y - rimCenter.y
  const discriminant = velocity.y * velocity.y + 2 * gravity * heightAboveRim
  if (discriminant < 0) return null

  const timeSeconds = (velocity.y + Math.sqrt(discriminant)) / gravity
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return null

  const x = position.x + velocity.x * timeSeconds
  const z = position.z + velocity.z * timeSeconds
  return {
    timeSeconds,
    position: { x, y: rimCenter.y, z },
    horizontalDistance: Math.hypot(x - rimCenter.x, z - rimCenter.z),
  }
}
