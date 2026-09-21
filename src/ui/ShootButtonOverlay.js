const SHOOT_BUTTON_SOURCE = 'SHOOT_BUTTON'

export function canStartShootPointer(event, activePointerId) {
  return activePointerId === null && !(event.pointerType === 'mouse' && event.button !== 0)
}

export class ShootButtonOverlay {
  constructor({ onPress, onRelease, onCancel }) {
    this.onPress = onPress
    this.onRelease = onRelease
    this.onCancel = onCancel
    this.root = document.createElement('button')
    this.root.type = 'button'
    this.root.className = 'shoot-button-overlay'
    this.root.textContent = 'SHOOT'
    this.root.setAttribute('aria-label', 'Hold to shoot')
    this.activePointerId = null

    this.pointerDownHandler = (event) => this.handlePointerDown(event)
    this.pointerUpHandler = (event) => this.handlePointerUp(event)
    this.pointerCancelHandler = (event) => this.handlePointerCancel(event)
    this.windowPointerUpHandler = (event) => this.handlePointerUp(event)
    this.windowPointerCancelHandler = (event) => this.handlePointerCancel(event)
    this.root.addEventListener('pointerdown', this.pointerDownHandler)
    this.root.addEventListener('pointerup', this.pointerUpHandler)
    this.root.addEventListener('pointercancel', this.pointerCancelHandler)
    window.addEventListener('pointerup', this.windowPointerUpHandler)
    window.addEventListener('pointercancel', this.windowPointerCancelHandler)
    document.body.append(this.root)
  }

  handlePointerDown(event) {
    if (!canStartShootPointer(event, this.activePointerId)) return
    event.preventDefault()
    if (!this.onPress(SHOOT_BUTTON_SOURCE, event.pointerId, event.pointerType)) return
    this.activePointerId = event.pointerId
    this.root.setPointerCapture?.(event.pointerId)
  }

  handlePointerUp(event) {
    if (event.pointerId !== this.activePointerId) return
    event.preventDefault()
    this.onRelease(SHOOT_BUTTON_SOURCE, event.pointerId)
    this.clearPointer(event.pointerId)
  }

  handlePointerCancel(event) {
    if (event.pointerId !== this.activePointerId) return
    event.preventDefault()
    this.onCancel(SHOOT_BUTTON_SOURCE, event.pointerId)
    this.clearPointer(event.pointerId)
  }

  clearPointer(pointerId = this.activePointerId) {
    if (pointerId !== null && this.root.hasPointerCapture?.(pointerId)) this.root.releasePointerCapture?.(pointerId)
    this.activePointerId = null
  }

  update({ state, activeInputSource }) {
    const pressed = state === 'HOLDING' && activeInputSource === SHOOT_BUTTON_SOURCE
    this.root.classList.toggle('is-pressed', pressed)
    this.root.classList.toggle('is-disabled', state !== 'READY' && !pressed)
    if (!pressed && state !== 'HOLDING') this.clearPointer()
  }

  dispose() {
    this.root.removeEventListener('pointerdown', this.pointerDownHandler)
    this.root.removeEventListener('pointerup', this.pointerUpHandler)
    this.root.removeEventListener('pointercancel', this.pointerCancelHandler)
    window.removeEventListener('pointerup', this.windowPointerUpHandler)
    window.removeEventListener('pointercancel', this.windowPointerCancelHandler)
    this.root.remove()
  }
}

export { SHOOT_BUTTON_SOURCE }
