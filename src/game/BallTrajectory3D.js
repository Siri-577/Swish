export class BallTrajectory3D {
  constructor({ startPosition, targetPosition, durationMs, apexHeight }) {
    this.startPosition = { ...startPosition }
    this.targetPosition = { ...targetPosition }
    this.durationMs = durationMs
    this.controlPosition = {
      x: (startPosition.x + targetPosition.x) / 2,
      // This makes apexHeight an absolute world-space apex near the midpoint.
      y: 2 * apexHeight - (startPosition.y + targetPosition.y) / 2,
      z: (startPosition.z + targetPosition.z) / 2,
    }
  }

  getPosition(elapsedMs, out = { x: 0, y: 0, z: 0 }) {
    const t = Math.max(0, Math.min(elapsedMs / this.durationMs, 1))
    const inverseT = 1 - t
    const startWeight = inverseT * inverseT
    const controlWeight = 2 * inverseT * t
    const targetWeight = t * t
    out.x = startWeight * this.startPosition.x + controlWeight * this.controlPosition.x + targetWeight * this.targetPosition.x
    out.y = startWeight * this.startPosition.y + controlWeight * this.controlPosition.y + targetWeight * this.targetPosition.y
    out.z = startWeight * this.startPosition.z + controlWeight * this.controlPosition.z + targetWeight * this.targetPosition.z
    return out
  }
}
