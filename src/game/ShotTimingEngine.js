import { getGreenWindow, isWithinGreenWindow } from './GreenWindow.js'

export const ShotTimingEngine = {
  evaluate({ heldDuration, targetReleaseMs, windows, greenWindow = getGreenWindow({ targetReleaseMs, greenWindowMs: windows.greenMs }) }) {
    const errorMs = heldDuration - targetReleaseMs
    const absErrorMs = Math.abs(errorMs)
    let result

    if (isWithinGreenWindow(heldDuration, greenWindow)) result = 'GREEN'
    else if (errorMs >= -windows.slightlyMs && errorMs < -windows.greenMs) result = 'SLIGHTLY EARLY'
    else if (errorMs >= -windows.earlyMs && errorMs < -windows.slightlyMs) result = 'EARLY'
    else if (errorMs < -windows.earlyMs) result = 'VERY EARLY'
    else if (errorMs > windows.greenMs && errorMs <= windows.slightlyMs) result = 'SLIGHTLY LATE'
    else if (errorMs > windows.slightlyMs && errorMs <= windows.earlyMs) result = 'LATE'
    else result = 'VERY LATE'

    return { heldDuration, targetReleaseMs, errorMs, absErrorMs, result, isGreen: result === 'GREEN' }
  },
}
