import { vAdd, vSub, vScale, vDot, SOFTENING } from './vectorMath.js';

/**
 * Newtonian mutual gravitation:
 * a_i = G * sum_{j!=i} m_j * (r_j - r_i) / (|r_j - r_i|^2 + eps^2)^(3/2)
 */
export function computeAccelerations(positions, masses, G = 1) {
  const n = positions.length;
  const acc = new Array(n);
  for (let i = 0; i < n; i++) {
    acc[i] = [0, 0, 0];
  }
  for (let i = 0; i < n; i++) {
    const pi = positions[i];
    const mi = masses[i];
    for (let j = i + 1; j < n; j++) {
      const pj = positions[j];
      const dx = pj[0] - pi[0];
      const dy = pj[1] - pi[1];
      const dz = pj[2] - pi[2];
      const distSq = dx * dx + dy * dy + dz * dz + SOFTENING;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1 / (distSq * dist);

      const fi = G * masses[j] * invDist3;
      acc[i][0] += dx * fi;
      acc[i][1] += dy * fi;
      acc[i][2] += dz * fi;

      const fj = G * mi * invDist3;
      acc[j][0] -= dx * fj;
      acc[j][1] -= dy * fj;
      acc[j][2] -= dz * fj;
    }
  }
  return acc;
}

/**
 * State derivative for numerical integrators: { pos: vel, vel: acc }
 */
export function derivative(state, masses, G = 1) {
  const acc = computeAccelerations(state.pos, masses, G);
  return { pos: state.vel.map((v) => [...v]), vel: acc };
}

/**
 * Gravitational field vector sampled at an arbitrary point in space.
 */
export function computeFieldAt(point, positions, masses, G = 1) {
  let acc = [0, 0, 0];
  for (let j = 0; j < positions.length; j++) {
    const d = vSub(positions[j], point);
    const distSq = vDot(d, d) + SOFTENING;
    const dist = Math.sqrt(distSq);
    const factor = (G * masses[j]) / (distSq * dist);
    acc = vAdd(acc, vScale(d, factor));
  }
  return acc;
}

/**
 * Gravitational potential U sampled at an arbitrary point in space.
 * U = -G * sum_j (m_j / sqrt(|r_j - r|^2 + eps^2))
 */
export function computePotentialAt(point, positions, masses, G = 1) {
  let u = 0;
  for (let j = 0; j < positions.length; j++) {
    const d = vSub(positions[j], point);
    const dist = Math.sqrt(vDot(d, d) + SOFTENING);
    u -= (G * masses[j]) / dist;
  }
  return u;
}

/**
 * Fast zero-allocation gravitational potential computation for scalar coordinates (px, py, pz).
 * Eliminates garbage collection pressure on high-vertex meshes (e.g. spacetime fabric).
 */
export function computePotentialAtCoords(px, py, pz, positions, masses, G = 1) {
  let u = 0;
  for (let j = 0; j < positions.length; j++) {
    const pj = positions[j];
    const dx = pj[0] - px;
    const dy = pj[1] - py;
    const dz = pj[2] - pz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + SOFTENING);
    u -= (G * masses[j]) / dist;
  }
  return u;
}
