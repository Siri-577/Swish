function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export const NET_CAPTURE_DURATION_MS = 150
// Arms a prediction while the ball is descending above the rim. It is not a
// current-position centre test.
// The ball has a 0.12 m radius and approaches diagonally.  Starting the
// analytical pass prediction 0.35 m above the plane gives Havok a full
// physics step to update the rim filter before the ball surface can contact
// an upper rim node.  This is only an arm zone: the projected rim-plane
// position still has to fit the real centre-pass opening.
export const HOOP_ENTRY_HEIGHT_METERS = 0.35
export const NET_EXIT_MARGIN_METERS = 0.08
// The collider-derived centre opening is already radius-compensated. Keep a
// small clearance, but not so much that an otherwise valid centre shot cannot
// commit until its surface is already at the rim.
export const SAFE_ENTRY_MARGIN_METERS = 0.005
export const NET_HORIZONTAL_DAMP_DURATION_RATIO = 0.6
export const NET_HORIZONTAL_DAMPING_PER_SECOND = 17
export const NET_VERTICAL_DAMPING_PER_SECOND = 4.5

export function getNetHorizontalRetain(rimContactCount) {
  return rimContactCount > 0 ? 0.2 : 0.1
}

export function getSafeEntryRadius({ rimInnerRadius, ballRadius, rimColliderCenterRadius, rimColliderRadius }) {
  const visualOpeningRadius = rimInnerRadius - ballRadius
  const colliderOpeningRadius = rimColliderCenterRadius - rimColliderRadius - ballRadius
  return Math.max(0, Math.min(visualOpeningRadius, colliderOpeningRadius) - SAFE_ENTRY_MARGIN_METERS)
}

export function getNetExitPlaneY(rimY, netHeight) {
  return rimY - netHeight - NET_EXIT_MARGIN_METERS
}

export function crossesDownwardPlane(previousY, currentY, planeY, verticalVelocity) {
  return previousY > planeY && currentY <= planeY && verticalVelocity < 0
}

export function createNetExitVelocity(entryVelocity, rimContactCount) {
  const horizontalRetain = getNetHorizontalRetain(rimContactCount)
  return {
    x: entryVelocity.x * horizontalRetain,
    y: clamp(entryVelocity.y * 0.75, -5, -3),
    z: entryVelocity.z * horizontalRetain,
  }
}

export function getNetCaptureVelocity(entryVelocity, rimContactCount, progress, out = {}, exitVelocity = null) {
  const resolvedExitVelocity = exitVelocity ?? createNetExitVelocity(entryVelocity, rimContactCount)
  const t = clamp(progress, 0, 1)
  const horizontalT = clamp(t / NET_HORIZONTAL_DAMP_DURATION_RATIO, 0, 1)
  const horizontalEased = horizontalT * horizontalT * (3 - 2 * horizontalT)
  const verticalEased = t * t * (3 - 2 * t)
  out.x = entryVelocity.x + (resolvedExitVelocity.x - entryVelocity.x) * horizontalEased
  out.y = Math.min(0, entryVelocity.y + (resolvedExitVelocity.y - entryVelocity.y) * verticalEased)
  out.z = entryVelocity.z + (resolvedExitVelocity.z - entryVelocity.z) * horizontalEased
  return out
}

export function applyNetDampingVelocity(velocity, physicsDeltaSeconds, out = {}) {
  const dt = clamp(physicsDeltaSeconds, 0, 0.05)
  const horizontalFactor = Math.exp(-NET_HORIZONTAL_DAMPING_PER_SECOND * dt)
  const verticalFactor = Math.exp(-NET_VERTICAL_DAMPING_PER_SECOND * dt)
  out.x = velocity.x * horizontalFactor
  out.y = velocity.y < 0 ? velocity.y * verticalFactor : 0
  out.z = velocity.z * horizontalFactor
  return out
}
