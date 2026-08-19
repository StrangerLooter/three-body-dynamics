import { vSub, vDot } from './vectorMath.js';

/**
 * Phase-space separation metric between twin systems A & B:
 * Euclidean distance summed across each body's position coordinates.
 */
export function computeSeparation(stateA, stateB) {
  if (!stateA || !stateB || !stateA.pos || !stateB.pos) return 0;
  let sumSq = 0;
  for (let i = 0; i < stateA.pos.length; i++) {
    const d = vSub(stateA.pos[i], stateB.pos[i]);
    sumSq += vDot(d, d);
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
