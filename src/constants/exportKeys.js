export const EXPORT_KEYS = [
  't',
  'p0x', 'p0y', 'p0z', 'p1x', 'p1y', 'p1z', 'p2x', 'p2y', 'p2z',
  'v0x', 'v0y', 'v0z', 'v1x', 'v1y', 'v1z', 'v2x', 'v2y', 'v2z',
  'a0x', 'a0y', 'a0z', 'a1x', 'a1y', 'a1z', 'a2x', 'a2y', 'a2z',
  'KE', 'PE', 'Etot',
  'Px', 'Py', 'Pz', 'Lx', 'Ly', 'Lz',
  'comx', 'comy', 'comz',
  'd01', 'd02', 'd12',
];

export function makeEmptyHistory() {
  const H = { t: [], chaosT: [], sep: [], err: [], momMag: [], angMag: [] };
  EXPORT_KEYS.forEach((k) => {
    if (k !== 't') H[k] = [];
  });
  return H;
}
