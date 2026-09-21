export const SHOT_ZONE = {
  MID_RANGE: 'MID_RANGE',
  CORNER_3: 'CORNER_3',
  WING_3: 'WING_3',
  TOP_3: 'TOP_3',
  DEEP_3: 'DEEP_3',
}

export function createShotContext({ playerPosition, rimPosition }) {
  const horizontalDistance = Math.hypot(playerPosition.x - rimPosition.x, playerPosition.z - rimPosition.z)
  let shotZone
  if (horizontalDistance <= 4.75) shotZone = SHOT_ZONE.MID_RANGE
  else if (horizontalDistance > 8) shotZone = SHOT_ZONE.DEEP_3
  else if (Math.abs(playerPosition.x) > 4.5) shotZone = SHOT_ZONE.CORNER_3
  else if (Math.abs(playerPosition.x) > 2.5) shotZone = SHOT_ZONE.WING_3
  else shotZone = SHOT_ZONE.TOP_3

  return { playerPosition: { ...playerPosition }, rimPosition: { ...rimPosition }, distanceMeters: horizontalDistance, shotZone }
}
