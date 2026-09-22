export class BallisticTrajectory3D {
  constructor({ startPosition, launchVelocity, gravity, durationMs }) {
    this.startPosition = { ...startPosition }
    this.launchVelocity = { ...launchVelocity }
    this.gravity = gravity
    this.durationMs = durationMs
  }

  getPosition(elapsedMs, out = { x: 0, y: 0, z: 0 }) {
    const seconds = Math.max(0, Math.min(elapsedMs, this.durationMs)) / 1000
    out.x = this.startPosition.x + this.launchVelocity.x * seconds
    out.y = this.startPosition.y + this.launchVelocity.y * seconds - 0.5 * this.gravity * seconds * seconds
    out.z = this.startPosition.z + this.launchVelocity.z * seconds
    return out
  }

  getVelocity(elapsedMs, out = { x: 0, y: 0, z: 0 }) {
    const seconds = Math.max(0, Math.min(elapsedMs, this.durationMs)) / 1000
    out.x = this.launchVelocity.x
    out.y = this.launchVelocity.y - this.gravity * seconds
    out.z = this.launchVelocity.z
    return out
  }
}
