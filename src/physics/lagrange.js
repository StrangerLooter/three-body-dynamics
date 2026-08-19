import { vSub, vAdd, vScale, vLen, vCross } from './vectorMath.js';

/**
 * Calculates the 5 classical Lagrange equilibrium points (L1, L2, L3, L4, L5)
 * for the two dominant bodies in the system (e.g. m1 and m2).
 * 
 * L1, L2, L3 lie on the line connecting the two primaries (collinear points).
 * L4, L5 form equilateral triangles with the two primaries in their orbital plane.
 */
export function computeLagrangePoints(positions, masses, G = 1) {
  if (!positions || positions.length < 2 || !masses || masses.length < 2) {
    return [];
  }

  // Find the two most massive bodies
  const indexed = masses.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m);
  const i1 = indexed[0].i;
  const i2 = indexed[1].i;

  const m1 = masses[i1];
  const m2 = masses[i2];
  const p1 = positions[i1];
  const p2 = positions[i2];

  const M = m1 + m2;
  if (M <= 0) return [];

  const mu = m2 / M; // mass ratio
  const rVec = vSub(p2, p1);
  const R = vLen(rVec);

  if (R < 1e-4) return [];

  const uR = vScale(rVec, 1 / R); // Unit vector from body 1 to body 2

  // Center of Mass of the two primaries
  const com = vAdd(vScale(p1, m1 / M), vScale(p2, m2 / M));

  // Determine orbital plane normal vector
  let normal = [0, 0, 1];
  // Calculate perpendicular vector in the orbital plane
  let up = vCross(uR, normal);
  if (vLen(up) < 1e-3) {
    normal = [0, 1, 0];
    up = vCross(uR, normal);
  }
  const uUp = vScale(up, 1 / vLen(up));

  // Hill sphere approximation for collinear points
  const rHill = R * Math.cbrt(mu / 3);

  // L1: Between m1 and m2 (closer to m2)
  const pL1 = vSub(p2, vScale(uR, rHill));

  // L2: Beyond m2 (away from m1)
  const pL2 = vAdd(p2, vScale(uR, rHill));

  // L3: Beyond m1 (opposite side of m2)
  const pL3 = vSub(p1, vScale(uR, R * (1 - (7 / 12) * mu)));

  // L4: Leading equilateral triangle point (+60 deg)
  const halfR = vScale(uR, R * 0.5);
  const height = vScale(uUp, R * (Math.sqrt(3) / 2));
  const pL4 = vAdd(vAdd(p1, halfR), height);

  // L5: Trailing equilateral triangle point (-60 deg)
  const pL5 = vSub(vAdd(p1, halfR), height);

  return [
    { label: 'L₁', name: 'Lagrange 1', pos: pL1, stability: 'Unstable (Saddle)' },
    { label: 'L₂', name: 'Lagrange 2', pos: pL2, stability: 'Unstable (Saddle)' },
    { label: 'L₃', name: 'Lagrange 3', pos: pL3, stability: 'Unstable (Saddle)' },
    { label: 'L₄', name: 'Lagrange 4', pos: pL4, stability: 'Stable (Trojan)' },
    { label: 'L₅', name: 'Lagrange 5', pos: pL5, stability: 'Stable (Greek)' },
  ];
}
