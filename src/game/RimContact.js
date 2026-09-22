export function classifyRimContact(position, rimCenter) {
  const x = position.x - rimCenter.x
  const z = position.z - rimCenter.z
  if (Math.abs(z) >= Math.abs(x)) return z < 0 ? 'FRONT_RIM' : 'BACK_RIM'
  return x < 0 ? 'LEFT_RIM' : 'RIGHT_RIM'
}
