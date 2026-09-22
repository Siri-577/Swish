import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNetExitVelocity,
  applyNetDampingVelocity,
  crossesDownwardPlane,
  getNetCaptureVelocity,
  getNetExitPlaneY,
  getSafeEntryRadius,
} from './NetCapture.js'

test('clean make net capture strongly removes horizontal velocity while preserving downward exit', () => {
  const exit = createNetExitVelocity({ x: 1.2, y: -5.5, z: 6 }, 0)
  assert.equal(exit.x, 0.12)
  assert.ok(Math.abs(exit.z - 0.6) < 1e-12)
  assert.ok(exit.y < 0)
})

test('rim make retains more horizontal velocity and net capture never turns upward', () => {
  const entry = { x: 1.2, y: -5.5, z: 6 }
  const clean = createNetExitVelocity(entry, 0)
  const rim = createNetExitVelocity(entry, 1)
  const mid = getNetCaptureVelocity(entry, 0, 0.5)
  assert.ok(Math.abs(rim.z) > Math.abs(clean.z))
  assert.ok(mid.y <= 0)
})

test('entry safe radius respects both the visual and collider-limited opening', () => {
  const safeRadius = getSafeEntryRadius({
    rimInnerRadius: 0.235,
    ballRadius: 0.12,
    rimColliderCenterRadius: 0.2525,
    rimColliderRadius: 0.021,
  })
  assert.ok(Math.abs(safeRadius - 0.1065) < 1e-12)
})

test('entry and exit sensors require downward crossings at their planes', () => {
  const exitPlaneY = getNetExitPlaneY(3.048, 0.42)
  assert.ok(Math.abs(exitPlaneY - 2.548) < 1e-12)
  assert.equal(crossesDownwardPlane(3.2, 3.15, 3.168, -4), true)
  assert.equal(crossesDownwardPlane(2.6, 2.5, exitPlaneY, -4), true)
  assert.equal(crossesDownwardPlane(3.2, 3.15, 3.168, 1), false)
})

test('horizontal damping reaches its final retain before the capture window ends', () => {
  const velocity = getNetCaptureVelocity({ x: 1, y: -5, z: 6 }, 0, 0.6)
  assert.ok(Math.abs(velocity.x - 0.1) < 1e-12)
  assert.ok(Math.abs(velocity.z - 0.6) < 1e-12)
})

test('dt-based anisotropic damping removes horizontal motion much faster without reversing descent', () => {
  let velocity = { x: 1.2, y: -5, z: 6 }
  for (let frame = 0; frame < 18; frame += 1) velocity = applyNetDampingVelocity(velocity, 1 / 120)
  assert.ok(Math.hypot(velocity.x, velocity.z) < 0.5)
  assert.ok(velocity.y < 0)
  assert.ok(velocity.y > -5)
})
