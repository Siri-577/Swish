export const GameClock = {
  now() {
    return globalThis.performance.now()
  },
}
