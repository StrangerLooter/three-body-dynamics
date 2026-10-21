import { vSub, vDot } from './vectorMath.js';

/**
 * Phase-space separation metric between twin systems A & B:
 * Euclidean distance summed across each body's position coordinates.
 */
export function computeSeparation(stateA, stateB) {
  if (!stateA || !stateB || !stateA.pos || !stateB.pos) return 0;
  let sumSq = 0;
  const posA = stateA.pos;
  const posB = stateB.pos;
  const len = Math.min(posA.length, posB.length);
  for (let i = 0; i < len; i++) {
    const pA = posA[i];
    const pB = posB[i];
    const dx = pA[0] - pB[0];
    const dy = pA[1] - pB[1];
    const dz = pA[2] - pB[2];
    sumSq += dx * dx + dy * dy + dz * dz;
  }
  return Math.sqrt(sumSq);
}

/**
 * Approximate Lyapunov exponent estimation:
 * λ ≈ ln(d(t) / d(0)) / (t - t0)
 */
export function estimateLyapunov(initialSep, currentSep, elapsed) {
  if (elapsed <= 1e-6 || initialSep <= 0 || currentSep <= 0) return null;
  return Math.log(currentSep / initialSep) / elapsed;
}
