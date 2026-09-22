function isFiniteVector(vector) {
  return Boolean(vector)
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z)
}

// Intersects one downward physics-step segment with a horizontal plane. The
// resulting X/Z is the ball centre's swept crossing position.
export function getSweptPlaneCrossing({ previousPosition, currentPosition, planeY, referencePosition }) {
  if (!isFiniteVector(previousPosition) || !isFiniteVector(currentPosition)) return null
  if (!Number.isFinite(planeY) || !isFiniteVector(referencePosition)) return null
  if (!(previousPosition.y > planeY && currentPosition.y <= planeY)) return null
  const denominator = currentPosition.y - previousPosition.y
  if (denominator === 0) return null
  const t = (planeY - previousPosition.y) / denominator
  if (t < 0 || t > 1) return null
  const x = previousPosition.x + (currentPosition.x - previousPosition.x) * t
  const z = previousPosition.z + (currentPosition.z - previousPosition.z) * t
  return {
    t,
    position: { x, y: planeY, z },
    horizontalDistance: Math.hypot(x - referencePosition.x, z - referencePosition.z),
  }
}

// Convenience form for the rim's physical plane.
export function getSweptRimPlaneCrossing({ previousPosition, currentPosition, rimCenter }) {
  return getSweptPlaneCrossing({
    previousPosition,
    currentPosition,
    planeY: rimCenter?.y,
    referencePosition: rimCenter,
  })
}
