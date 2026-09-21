import { InputTiming } from '../core/InputTiming.js'

export class ShotInputController {
  constructor({ inputTiming = new InputTiming(), canPress = null, onPress = null, onRelease = null, onCancel = null } = {}) {
    this.inputTiming = inputTiming
    this.canPress = canPress
    this.onPress = onPress
    this.onRelease = onRelease
    this.onCancel = onCancel
    this.activeInputSource = null
    this.activePointerId = null
    this.target = null
  }

  press(source, pointerId = null) {
    if ((this.canPress && !this.canPress()) || this.activeInputSource !== null || !this.inputTiming.press()) return false
    this.activeInputSource = source
    this.activePointerId = source === 'pointer' ? pointerId : null
    if (this.onPress) this.onPress(source)
    return true
  }

  release(source, pointerId = null) {
    if (!this.matchesActiveInput(source, pointerId)) return null
    const duration = this.inputTiming.release()
    this.clearActiveInput()
    if (duration !== null && this.onRelease) this.onRelease(duration, source)
    return duration
  }

  cancel(source = null, pointerId = null) {
    if (this.activeInputSource === null) return false
    if (source !== null && !this.matchesActiveInput(source, pointerId)) return false
    this.inputTiming.reset()
    this.clearActiveInput()
    if (this.onCancel) this.onCancel()
    return true
  }

  handleKeyboardDown(event) {
    if (event.code !== 'Space') return false
    const accepted = this.press('keyboard')
    if (accepted) event.preventDefault()
    return accepted
  }

  handleKeyboardUp(event) {
    if (event.code !== 'Space') return null
    const duration = this.release('keyboard')
    if (duration !== null) event.preventDefault()
    return duration
  }

  attach(target = window) {
    this.detach()
    this.target = target
    this.keydownHandler = (event) => this.handleKeyboardDown(event)
    this.keyupHandler = (event) => this.handleKeyboardUp(event)
    this.blurHandler = () => this.cancel()
    this.visibilityHandler = () => {
      if (document.hidden) this.cancel()
    }
    target.addEventListener('keydown', this.keydownHandler)
    target.addEventListener('keyup', this.keyupHandler)
    target.addEventListener('blur', this.blurHandler)
    document.addEventListener('visibilitychange', this.visibilityHandler)
  }

  detach() {
    if (!this.target) return
    this.target.removeEventListener('keydown', this.keydownHandler)
    this.target.removeEventListener('keyup', this.keyupHandler)
    this.target.removeEventListener('blur', this.blurHandler)
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.target = null
  }

  matchesActiveInput(source, pointerId) {
    return this.activeInputSource === source
      && (source !== 'pointer' || this.activePointerId === pointerId)
  }

  clearActiveInput() {
    this.activeInputSource = null
    this.activePointerId = null
  }

  ensureConsistentState() {
    if (this.inputTiming.isPressed && this.activeInputSource === null) {
      this.inputTiming.reset()
      this.activePointerId = null
      return false
    }

    if (!this.inputTiming.isPressed && this.activeInputSource !== null) {
      this.clearActiveInput()
      return false
    }

    return true
  }
}
