import { Engine } from '@babylonjs/core'

export function createEngine(canvas) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, false)
  const deviceDpr = window.devicePixelRatio || 1
  const isMobile = window.matchMedia('(pointer: coarse)').matches
  const effectiveDpr = Math.min(deviceDpr, isMobile ? 1.75 : 2)
  engine.setHardwareScalingLevel(1 / effectiveDpr)
  return engine
}
