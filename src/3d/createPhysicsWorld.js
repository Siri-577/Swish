import HavokPhysics from '@babylonjs/havok'
import { HavokPlugin, PhysicsBody, PhysicsMotionType, PhysicsShapeBox, PhysicsShapeSphere, Quaternion, TransformNode, Vector3 } from '@babylonjs/core'
import { WORLD_CONFIG } from '../config/world-config.js'
import { classifyRimContact } from '../game/RimContact.js'

export const COLLISION = { WORLD: 1, RIM: 2, BALL: 4 }
export const BALL_BODY_INITIAL_MOTION_TYPE = PhysicsMotionType.DYNAMIC
export const BALL_LINEAR_DAMPING = 0.045
// Kept immutable while the game runs: Green is an accurate target, not a
// collision-mode exception.
export const BALL_COLLIDE_MASK = COLLISION.WORLD | COLLISION.RIM

function material(friction, restitution) {
  return { friction, staticFriction: friction, restitution }
}

function addStaticBox(scene, node, extents, physicsMaterial, membershipMask = COLLISION.WORLD) {
  const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, scene)
  const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), extents, scene)
  shape.material = physicsMaterial
  shape.filterMembershipMask = membershipMask
  shape.filterCollideMask = COLLISION.BALL
  body.shape = shape
  return body
}

export async function createPhysicsWorld(scene, { ball, hoop, floor }) {
  const config = WORLD_CONFIG.shotPhysics
  const havok = await HavokPhysics()
  const plugin = new HavokPlugin(true, havok)
  plugin.setTimeStep(1 / 120)
  scene.enablePhysics(new Vector3(0, -config.gravity, 0), plugin)

  const ballBody = new PhysicsBody(ball, BALL_BODY_INITIAL_MOTION_TYPE, false, scene)
  const ballShape = new PhysicsShapeSphere(Vector3.Zero(), WORLD_CONFIG.ball.radius, scene)
  ballShape.material = material(config.ballFriction, config.ballRestitution)
  ballShape.filterMembershipMask = COLLISION.BALL
  ballShape.filterCollideMask = BALL_COLLIDE_MASK
  ballBody.shape = ballShape
  ballBody.setMassProperties({ mass: config.ballMassKg })
  ballBody.setLinearDamping(BALL_LINEAR_DAMPING)
  ballBody.setAngularDamping(0.08)
  ballBody.setCollisionCallbackEnabled(true)

  const floorBody = addStaticBox(
    scene,
    floor,
    new Vector3(WORLD_CONFIG.court.width, 0.08, WORLD_CONFIG.court.length),
    material(config.floorFriction, config.floorRestitution),
  )

  const boardBody = addStaticBox(
    scene,
    hoop.backboard,
    new Vector3(WORLD_CONFIG.hoop.backboardWidth, WORLD_CONFIG.hoop.backboardHeight, WORLD_CONFIG.hoop.backboardDepth),
    material(0.25, 0.45),
  )

  const rimBodies = new Map()
  const rimRadius = WORLD_CONFIG.hoop.rimInnerRadius + WORLD_CONFIG.hoop.rimTubeRadius
  for (let index = 0; index < config.rimColliderCount; index += 1) {
    const angle = (index / config.rimColliderCount) * Math.PI * 2
    const node = new TransformNode(`rim-collider-${index}`, scene)
    node.position.set(
      hoop.rimCenter.x + Math.cos(angle) * rimRadius,
      hoop.rimCenter.y,
      hoop.rimCenter.z + Math.sin(angle) * rimRadius,
    )
    const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, scene)
    const shape = new PhysicsShapeSphere(Vector3.Zero(), config.rimColliderRadius, scene)
    shape.material = material(config.rimFriction, config.rimRestitution)
    shape.filterMembershipMask = COLLISION.RIM
    shape.filterCollideMask = COLLISION.BALL
    body.shape = shape
    rimBodies.set(body, classifyRimContact(node.position, hoop.rimCenter))
  }

  return {
    ballBody,
    ballShape,
    floorBody,
    boardBody,
    rimBodies,
    plugin,
    gravity: config.gravity,
    ballMassKg: config.ballMassKg,
    ballRadius: WORLD_CONFIG.ball.radius,
    ballLinearDamping: BALL_LINEAR_DAMPING,
    rimColliderCenterRadius: rimRadius,
    rimColliderRadius: config.rimColliderRadius,
    physicsTimeStep: 1 / 120,
    collision: COLLISION,
  }
}
