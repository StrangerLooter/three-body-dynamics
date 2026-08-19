import { vScale } from './vectorMath.js';

/**
 * Chenciner–Montgomery Figure-Eight choreography
 * A stable periodic three-equal-mass solution with a slight z-velocity nudge for 3D depth.
 */
export function presetFigureEight() {
  const p1 = [0.97000436, -0.24308753, 0];
  const p2 = [-0.97000436, 0.24308753, 0];
  const p3 = [0, 0, 0];
  const v3 = [-0.93240737, -0.86473146, 0.015];
  const v1 = vScale(v3, -0.5);
  const v2 = vScale(v3, -0.5);
  return {
    name: 'FIGURE-8 ORBIT',
    masses: [1, 1, 1],
    radii: [0.16, 0.16, 0.16],
    state: { pos: [p1, p2, p3], vel: [v1, v2, v3] },
  };
}

/**
 * Hierarchical Triple system (inner binary + outer perturbed tertiary)
 */
export function presetHierarchicalTriple() {
  return {
    name: 'HIERARCHICAL TRIPLE',
    masses: [1.6, 1.0, 0.25],
    radii: [0.18, 0.14, 0.09],
    state: {
      pos: [
        [-0.3, 0, 0],
        [0.3, 0, 0],
        [2.4, 0.4, 0.6],
      ],
      vel: [
        [0, -0.55, 0],
        [0, 0.9, 0],
        [-0.1, 0.42, 0.02],
      ],
    },
  };
}

/**
 * Equal-Mass Chaotic orbital configuration
 */
export function presetUnstableChaos() {
  return {
    name: 'EQUAL-MASS CHAOS',
    masses: [1, 1, 1],
    radii: [0.15, 0.15, 0.15],
    state: {
      pos: [
        [1, 0, 0.2],
        [-0.5, 0.87, -0.15],
        [-0.5, -0.87, 0.1],
      ],
      vel: [
        [0, 0.6, 0.05],
        [-0.52, -0.3, 0],
        [0.52, -0.3, -0.05],
      ],
    },
  };
}

/**
 * Restricted Three-Body regime: m3 << m1, m2
 * Body 3 behaves as a near test-particle orbiting an equal-mass binary.
 */
export function presetRestrictedThreeBody() {
  return {
    name: 'RESTRICTED THREE-BODY',
    masses: [1, 1, 0.001],
    radii: [0.16, 0.16, 0.06],
    state: {
      pos: [
        [-0.5, 0, 0],
        [0.5, 0, 0],
        [0, 2.2, 0.3],
      ],
      vel: [
        [0, -0.7, 0],
        [0, 0.7, 0],
        [-0.35, 0, 0.015],
      ],
    },
  };
}

export const PRESETS = {
  figureEight: presetFigureEight,
  hierarchical: presetHierarchicalTriple,
  chaos: presetUnstableChaos,
  restricted: presetRestrictedThreeBody,
};
