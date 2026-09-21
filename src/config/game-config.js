import * as Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene.js'
import { ShootingPrototypeScene } from '../scenes/ShootingPrototypeScene.js'

export function createGameConfig() {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    width: 1280,
    height: 720,
    backgroundColor: '#111111',
    audio: { noAudio: true },
    scene: [BootScene, ShootingPrototypeScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }
}
