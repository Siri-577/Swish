export class BallTrajectory {
  constructor({ startX, startY, targetX, targetY, duration, arcHeight = 0, controlX, controlY }) {
    this.startX = startX
    this.startY = startY
    this.targetX = targetX
    this.targetY = targetY
    this.duration = duration
    this.controlX = controlX ?? (startX + targetX) / 2
    this.controlY = controlY ?? (startY + targetY) / 2 - arcHeight
  }

  getPosition(elapsed, out = { x: 0, y: 0 }) {
    const t = Math.max(0, Math.min(elapsed / this.duration, 1))
    const inverseT = 1 - t
    out.x = inverseT * inverseT * this.startX + 2 * inverseT * t * this.controlX + t * t * this.targetX
    out.y = inverseT * inverseT * this.startY + 2 * inverseT * t * this.controlY + t * t * this.targetY
    return out
  }
}
