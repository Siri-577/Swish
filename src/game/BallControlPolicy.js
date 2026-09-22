export function canSyncHeldBall(state) {
  return state === 'READY' || state === 'HOLDING'
}
