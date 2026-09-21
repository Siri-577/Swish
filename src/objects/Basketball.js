import * as Phaser from 'phaser'

export class Basketball extends Phaser.GameObjects.Arc {
  constructor(scene, startPosition) {
    super(scene, startPosition.x, startPosition.y, 17, 0, 360, false, 0xf58220)
    scene.add.existing(this)
    this.setStrokeStyle(2, 0x3d210e)
    this.startPosition = startPosition
    this.flightSegments = []
    this.flightPosition = { x: startPosition.x, y: startPosition.y }
    this.totalDuration = 0
    this.initialRotation = 0
    this.rotationSpeed = 0
    this.phase = 'IDLE'
  }

  resetToStart() {
    this.setPosition(this.startPosition.x, this.startPosition.y)
    this.setRotation(0)
    this.setVisible(true)
    this.flightSegments = []
    this.totalDuration = 0
    this.phase = 'IDLE'
  }

  launch(segments, rotationSpeed) {
    this.flightSegments = segments
    this.totalDuration = segments.reduce((total, segment) => total + segment.duration, 0)
    this.initialRotation = 0
    this.rotationSpeed = rotationSpeed
    this.phase = segments[0].phase
    this.setVisible(true)
  }

  updateFlight(elapsed) {
    let segmentElapsed = Math.max(0, elapsed)
    let segment = this.flightSegments[this.flightSegments.length - 1]

    for (let index = 0; index < this.flightSegments.length; index += 1) {
      const candidate = this.flightSegments[index]
      if (segmentElapsed <= candidate.duration || index === this.flightSegments.length - 1) {
        segment = candidate
        this.phase = candidate.phase
        break
      }
      segmentElapsed -= candidate.duration
    }

    segment.trajectory.getPosition(segmentElapsed, this.flightPosition)
    this.setPosition(this.flightPosition.x, this.flightPosition.y)
    this.setRotation(this.initialRotation + elapsed * this.rotationSpeed)
    if (elapsed >= this.totalDuration) this.phase = 'COMPLETE'
    return elapsed >= this.totalDuration
  }
}
