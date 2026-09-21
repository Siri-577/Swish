import * as Phaser from 'phaser'

export class Hoop extends Phaser.GameObjects.Container {
  constructor(scene, x, y, rimWidth) {
    super(scene, x, y)
    scene.add.existing(this)
    this.rimCenterX = x
    this.rimCenterY = y
    this.rimWidth = rimWidth
    this.impactTime = -1

    const graphics = new Phaser.GameObjects.Graphics(scene)
    graphics.fillStyle(0xe7e7e7).fillRect(30, -82, 14, 118)
    graphics.lineStyle(5, 0xe85d2a).strokeEllipse(0, 0, rimWidth, 24)
    graphics.lineStyle(2, 0x9a9a9a)
    graphics.lineBetween(-rimWidth / 2 + 10, 5, -rimWidth / 2 + 23, 50)
    graphics.lineBetween(rimWidth / 2 - 10, 5, rimWidth / 2 - 23, 50)
    graphics.lineBetween(-rimWidth / 2 + 23, 50, rimWidth / 2 - 23, 50)
    this.add(graphics)
  }

  impact(now) {
    this.impactTime = now
  }

  updateFeedback(now) {
    if (this.impactTime < 0) return
    const elapsed = now - this.impactTime
    if (elapsed >= 80) {
      this.setScale(1)
      this.impactTime = -1
      return
    }
    this.setScale(1 + Math.sin((elapsed / 80) * Math.PI) * 0.06)
  }
}
