import { Color3, MeshBuilder, Vector3 } from '@babylonjs/core'

export const VERLET_DAMPING = 0.975
export const NET_GRAVITY = 2.2
export const NET_CONSTRAINT_ITERATIONS = 4
export const NET_VERTICAL_STIFFNESS = 0.98
export const NET_UPPER_HORIZONTAL_STIFFNESS = 0.9
export const NET_MIDDLE_HORIZONTAL_STIFFNESS = 0.75
export const NET_BOTTOM_HORIZONTAL_STIFFNESS = 0.6
export const NET_DIAGONAL_STIFFNESS = 0.55
export const NET_VERTICAL_MAX_STRETCH = 1.18
export const NET_DRAG_TRANSFER = 0.32
export const NET_RESTORE_STRENGTH = 1.4
export const NET_SLEEP_MOTION_SQUARED = 0.000006
export const NET_SLEEP_POSITION_SQUARED = 0.000036
export const NET_SLEEP_DELAY_SECONDS = 0.25

export const DEBUG_NET_NODES = false

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function distanceBetween(a, b) {
  const dx = b.position.x - a.position.x
  const dy = b.position.y - a.position.y
  const dz = b.position.z - a.position.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function calculateImpactMagnitude({ horizontalSpeed = 0, verticalSpeed = 0, makeType = 'CLEAN' }) {
  const cleanScale = makeType === 'RIM' ? 0.78 : 1
  return clamp((Math.abs(verticalSpeed) * 0.15 + horizontalSpeed * 0.08) * cleanScale, 0.45, 1.8)
}

export function calculateNodeInfluence(distanceXZ, influenceRadius) {
  if (!Number.isFinite(distanceXZ) || !Number.isFinite(influenceRadius) || influenceRadius <= 0) return 0
  return clamp(1 - distanceXZ / influenceRadius, 0, 1)
}

export function isNetAtRest(nodes) {
  return nodes.every((node) => {
    const motionX = node.position.x - node.previousPosition.x
    const motionY = node.position.y - node.previousPosition.y
    const motionZ = node.position.z - node.previousPosition.z
    const motionSquared = motionX * motionX + motionY * motionY + motionZ * motionZ
    const dx = node.position.x - node.restPosition.x
    const dy = node.position.y - node.restPosition.y
    const dz = node.position.z - node.restPosition.z
    return motionSquared < NET_SLEEP_MOTION_SQUARED
      && dx * dx + dy * dy + dz * dz < NET_SLEEP_POSITION_SQUARED
  })
}

export class DynamicNetVisual {
  constructor({ scene, hoopCenter, rimInnerRadius, rimTubeRadius, netHeight, netBottomRadius, strandCount = 12 }) {
    this.scene = scene
    this.hoopCenter = hoopCenter.clone()
    this.rimInnerRadius = rimInnerRadius
    this.rimTubeRadius = rimTubeRadius
    this.netHeight = netHeight
    this.netBottomRadius = netBottomRadius
    this.strandCount = strandCount
    this.strands = []
    this.dynamicNodes = []
    this.constraints = []
    this.lines = []
    this.interactionActive = false
    this.hasInteractionSample = false
    this.interactionPosition = new Vector3()
    this.interactionDelta = new Vector3()
    this.interactionBallRadius = 0.12
    this.sleepElapsedSeconds = 0
    this.sleeping = true
    this.createNodes()
    this.createConstraints()
    this.createLines()
    this.mesh = MeshBuilder.CreateLineSystem('basketball-net', { lines: this.lines, updatable: true }, scene)
    this.mesh.color = new Color3(0.9, 0.92, 0.95)
  }

  createNodes() {
    for (let strandIndex = 0; strandIndex < this.strandCount; strandIndex += 1) {
      const angle = (strandIndex / this.strandCount) * Math.PI * 2
      const radialX = Math.cos(angle)
      const radialZ = Math.sin(angle)
      const radii = [this.rimInnerRadius, this.rimInnerRadius * 0.82, this.rimInnerRadius * 0.62, this.netBottomRadius]
      const verticalOffsets = [this.rimTubeRadius, this.netHeight * 0.3, this.netHeight * 0.65, this.netHeight]
      const strand = []
      for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
        const restPosition = new Vector3(
          this.hoopCenter.x + radialX * radii[pointIndex],
          this.hoopCenter.y - verticalOffsets[pointIndex],
          this.hoopCenter.z + radialZ * radii[pointIndex],
        )
        const node = {
          fixed: pointIndex === 0,
          level: pointIndex,
          radialX,
          radialZ,
          restPosition,
          position: restPosition.clone(),
          previousPosition: restPosition.clone(),
        }
        strand.push(node)
        if (!node.fixed) this.dynamicNodes.push(node)
      }
      this.strands.push(strand)
    }
  }

  addConstraint(a, b, stiffness, maxStretch = Infinity) {
    this.constraints.push({ a, b, restLength: distanceBetween(a, b), stiffness, maxStretch })
  }

  createConstraints() {
    for (const strand of this.strands) {
      this.addConstraint(strand[0], strand[1], NET_VERTICAL_STIFFNESS, NET_VERTICAL_MAX_STRETCH)
      this.addConstraint(strand[1], strand[2], NET_VERTICAL_STIFFNESS, NET_VERTICAL_MAX_STRETCH)
      this.addConstraint(strand[2], strand[3], NET_VERTICAL_STIFFNESS, NET_VERTICAL_MAX_STRETCH)
    }
    const horizontalStiffness = [null, NET_UPPER_HORIZONTAL_STIFFNESS, NET_MIDDLE_HORIZONTAL_STIFFNESS, NET_BOTTOM_HORIZONTAL_STIFFNESS]
    for (let strandIndex = 0; strandIndex < this.strandCount; strandIndex += 1) {
      const nextIndex = (strandIndex + 1) % this.strandCount
      const previousIndex = (strandIndex + this.strandCount - 1) % this.strandCount
      for (const level of [1, 2, 3]) this.addConstraint(this.strands[strandIndex][level], this.strands[nextIndex][level], horizontalStiffness[level])
      this.addConstraint(this.strands[strandIndex][1], this.strands[nextIndex][2], NET_DIAGONAL_STIFFNESS)
      this.addConstraint(this.strands[strandIndex][2], this.strands[previousIndex][3], NET_DIAGONAL_STIFFNESS)
    }
  }

  createLines() {
    for (const strand of this.strands) this.lines.push(strand.map((node) => node.position))
    for (const level of [1, 2, 3]) {
      for (let strandIndex = 0; strandIndex < this.strandCount; strandIndex += 1) {
        const nextIndex = (strandIndex + 1) % this.strandCount
        this.lines.push([this.strands[strandIndex][level].position, this.strands[nextIndex][level].position])
      }
    }
  }

  onBallEnter(netImpactData) {
    if (!netImpactData?.entryPosition || !netImpactData?.entryVelocity) return
    this.wakeUp()
    const impact = calculateImpactMagnitude({
      horizontalSpeed: netImpactData.horizontalSpeed,
      verticalSpeed: netImpactData.verticalSpeed,
      makeType: netImpactData.makeType,
    })
    const influenceRadius = this.rimInnerRadius + 0.14
    for (const node of this.dynamicNodes) {
      const influence = calculateNodeInfluence(Math.hypot(node.position.x - netImpactData.entryPosition.x, node.position.z - netImpactData.entryPosition.z), influenceRadius)
      if (influence === 0) continue
      const displacement = impact * influence * (0.016 + node.level * 0.003)
      node.previousPosition.x -= node.radialX * displacement * 0.65
      node.previousPosition.z -= node.radialZ * displacement * 0.65
      node.previousPosition.y += displacement
    }
  }

  updateBallInteraction(position, velocity, ballRadius) {
    if (!position || !velocity) return
    if (this.hasInteractionSample) {
      this.interactionDelta.x = position.x - this.interactionPosition.x
      this.interactionDelta.y = position.y - this.interactionPosition.y
      this.interactionDelta.z = position.z - this.interactionPosition.z
    } else {
      this.interactionDelta.setAll(0)
      this.hasInteractionSample = true
    }
    this.interactionPosition.copyFrom(position)
    this.interactionBallRadius = ballRadius
    this.interactionActive = true
    this.wakeUp()
  }

  stopBallInteraction() {
    this.interactionActive = false
    this.hasInteractionSample = false
    this.interactionDelta.setAll(0)
  }

  integrateNode(node, dt) {
    const motionX = (node.position.x - node.previousPosition.x) * VERLET_DAMPING
    const motionY = (node.position.y - node.previousPosition.y) * VERLET_DAMPING
    const motionZ = (node.position.z - node.previousPosition.z) * VERLET_DAMPING
    node.previousPosition.copyFrom(node.position)
    node.position.x += motionX
    node.position.y += motionY - NET_GRAVITY * dt * dt
    node.position.z += motionZ
    const restore = NET_RESTORE_STRENGTH * dt
    node.position.x += (node.restPosition.x - node.position.x) * restore
    node.position.y += (node.restPosition.y - node.position.y) * restore
    node.position.z += (node.restPosition.z - node.position.z) * restore
  }

  resolveBallSeparation(node, transferDrag) {
    if (!this.interactionActive) return
    const dx = node.position.x - this.interactionPosition.x
    const dy = node.position.y - this.interactionPosition.y
    const dz = node.position.z - this.interactionPosition.z
    const minimumDistance = this.interactionBallRadius + 0.035
    const distanceSquared = dx * dx + dy * dy + dz * dz
    if (distanceSquared >= minimumDistance * minimumDistance) return
    const distance = Math.sqrt(Math.max(distanceSquared, 0.000001))
    const scale = (minimumDistance - distance) / distance
    const pushX = dx * scale
    const pushY = dy * scale
    const pushZ = dz * scale
    node.position.x += pushX
    node.position.y += pushY
    node.position.z += pushZ
    node.previousPosition.x += pushX
    node.previousPosition.y += pushY
    node.previousPosition.z += pushZ
    if (!transferDrag) return
    const dragX = this.interactionDelta.x * NET_DRAG_TRANSFER
    const dragY = this.interactionDelta.y * NET_DRAG_TRANSFER
    const dragZ = this.interactionDelta.z * NET_DRAG_TRANSFER
    node.position.x += dragX
    node.position.y += dragY
    node.position.z += dragZ
    node.previousPosition.x += dragX * 0.4
    node.previousPosition.y += dragY * 0.4
    node.previousPosition.z += dragZ * 0.4
  }

  solveConstraint(constraint) {
    const { a, b, restLength, stiffness, maxStretch } = constraint
    const dx = b.position.x - a.position.x
    const dy = b.position.y - a.position.y
    const dz = b.position.z - a.position.z
    const distance = Math.sqrt(Math.max(dx * dx + dy * dy + dz * dz, 0.000001))
    const limitedLength = Math.min(distance, restLength * maxStretch)
    const error = limitedLength - restLength
    if (Math.abs(error) < 0.000001) return
    const correction = error / distance * stiffness
    const aWeight = a.fixed ? 0 : (b.fixed ? 1 : 0.5)
    const bWeight = b.fixed ? 0 : (a.fixed ? 1 : 0.5)
    if (aWeight) {
      a.position.x += dx * correction * aWeight
      a.position.y += dy * correction * aWeight
      a.position.z += dz * correction * aWeight
    }
    if (bWeight) {
      b.position.x -= dx * correction * bWeight
      b.position.y -= dy * correction * bWeight
      b.position.z -= dz * correction * bWeight
    }
  }

  pinTopRing() {
    for (const strand of this.strands) {
      const top = strand[0]
      top.position.copyFrom(top.restPosition)
      top.previousPosition.copyFrom(top.restPosition)
    }
  }

  update(deltaSeconds) {
    const dt = clamp(deltaSeconds, 0, 1 / 30)
    if (dt <= 0 || this.sleeping) return
    this.pinTopRing()
    for (const node of this.dynamicNodes) {
      this.integrateNode(node, dt)
      this.resolveBallSeparation(node, true)
    }
    for (let iteration = 0; iteration < NET_CONSTRAINT_ITERATIONS; iteration += 1) {
      for (const constraint of this.constraints) this.solveConstraint(constraint)
      for (const node of this.dynamicNodes) this.resolveBallSeparation(node, false)
      this.pinTopRing()
    }
    this.mesh = MeshBuilder.CreateLineSystem('basketball-net', { lines: this.lines, instance: this.mesh }, this.scene)
    if (isNetAtRest(this.dynamicNodes)) {
      this.sleepElapsedSeconds += dt
      if (this.sleepElapsedSeconds >= NET_SLEEP_DELAY_SECONDS) this.sleeping = true
    } else {
      this.sleepElapsedSeconds = 0
    }
  }

  wakeUp() {
    this.sleeping = false
    this.sleepElapsedSeconds = 0
  }

  reset() {
    for (const node of this.dynamicNodes) {
      node.position.copyFrom(node.restPosition)
      node.previousPosition.copyFrom(node.restPosition)
    }
    this.stopBallInteraction()
    this.sleeping = true
    this.sleepElapsedSeconds = 0
    this.mesh = MeshBuilder.CreateLineSystem('basketball-net', { lines: this.lines, instance: this.mesh }, this.scene)
  }

  dispose() {
    this.mesh?.dispose()
  }
}
