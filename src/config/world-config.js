// Swish world scale: one Babylon world unit represents one metre.
export const COURT = {
  width: 15.24,
  length: 14.3,
  boundaryInset: 0.3,
  paintWidth: 4.88,
  paintDepth: 5.79,
}

export const HOOP = {
  x: 0,
  y: 3.048,
  z: 5.8,
  rimInnerRadius: 0.235,
  rimTubeRadius: 0.0175,
  backboardWidth: 1.88,
  backboardHeight: 1.08,
  backboardDepth: 0.05,
  netHeight: 0.42,
  netBottomRadius: 0.13,
  netStrandCount: 12,
}

export const BALL = { radius: 0.12, diameter: 0.24 }

export const SHOT_PHYSICS = {
  gravity: 9.81,
  ballMassKg: 0.62,
  ballRestitution: 0.62,
  ballFriction: 0.42,
  rimRestitution: 0.58,
  rimFriction: 0.3,
  floorRestitution: 0.48,
  floorFriction: 0.72,
  rimColliderCount: 16,
  // Deliberately small: these are the physical tube nodes, not visual meshes.
  rimColliderRadius: 0.021,
}

export const PLAYER = {
  height: 1.82,
  bodyHeight: 1.58,
  bodyRadius: 0.24,
  headDiameter: 0.24,
  x: 0.2,
  y: 0,
  // Places the default release point at NBA top-of-key three-point distance.
  z: -1.62,
}

export const WORLD_CONFIG = {
  metersPerUnit: 1,
  court: COURT,
  hoop: HOOP,
  ball: BALL,
  shotPhysics: SHOT_PHYSICS,
  player: PLAYER,
}
