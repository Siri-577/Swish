export function getGreenWindow({ targetReleaseMs, greenWindowMs }) {
  return {
    startMs: targetReleaseMs - greenWindowMs,
    endMs: targetReleaseMs + greenWindowMs,
  }
}

export function isWithinGreenWindow(releaseMs, greenWindow) {
  return releaseMs >= greenWindow.startMs && releaseMs <= greenWindow.endMs
}
