function finiteCompression(value) {
  return Number.isFinite(value) && value >= 0.68 && value <= 1 ? value : 1
}

export function createShotTimeCompression({ launchVelocity, worldGravity, timeCompression }) {
  const compression = finiteCompression(timeCompression)
  const velocityScale = 1 / compression
  const effectiveGravity = worldGravity / (compression * compression)
  return {
    timeCompression: compression,
    velocityScale,
    effectiveGravity,
    extraGravity: effectiveGravity - worldGravity,
    launchVelocity: {
      x: launchVelocity.x * velocityScale,
      y: launchVelocity.y * velocityScale,
      z: launchVelocity.z * velocityScale,
    },
  }
}
