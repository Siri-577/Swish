import { GameClock } from './GameClock.js'

export class InputTiming {
  constructor({ now = GameClock.now } = {}) {
    this.now = now
    this.isPressed = false
    this.pressStartTime = null
    this.releaseTime = null
    this.lastReleaseDuration = null
  }

  press() {
    if (this.isPressed) return false
    this.isPressed = true
    this.pressStartTime = this.now()
    return true
  }

  release() {
    if (!this.isPressed) return null
    this.releaseTime = this.now()
    this.lastReleaseDuration = this.releaseTime - this.pressStartTime
    this.reset()
    return this.lastReleaseDuration
  }

  getHeldDuration() {
    return this.isPressed ? this.now() - this.pressStartTime : 0
  }

  reset() {
    this.isPressed = false
    this.pressStartTime = null
  }

  handleKeyDown(event) {
    return event.code === 'Space' && this.press()
  }

  handleKeyUp(event) {
    return event.code === 'Space' ? this.release() : null
  }
}
