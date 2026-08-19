import { vScale } from './vectorMath.js';

/**
 * Solar Planetary System
 * Central Sun with orbiting Earth and Mars in stable Keplerian trajectories.
 */
export function presetSolarSystem() {
  const pSun = [0, 0, 0];
  const vSun = [0, 0, 0];

  const pEarth = [1.5, 0, 0];
  const vEarth = [0, 1.82, 0.01];

  const pMars = [2.4, 0, 0.1];
  const vMars = [0, 1.44, -0.015];

  return {
    name: 'SOLAR PLANETARY SYSTEM',
    masses: [5.0, 0.03, 0.015],
    radii: [0.26, 0.14, 0.11],
    state: {
      pos: [pSun, pEarth, pMars],
      vel: [vSun, vEarth, vMars],
    },
  };
}

/**
 * Chenciner–Montgomery Figure-Eight choreography
 * Stable periodic three-body solution with Sun starting at the center origin (0,0,0).
 */
export function presetFigureEight() {
  const pSun = [0, 0, 0];
  const vSun = [-0.93240737, -0.86473146, 0.015];

  const pEarth = [0.97000436, -0.24308753, 0];
  const vEarth = vScale(vSun, -0.5);

  const pMars = [-0.97000436, 0.24308753, 0];
  const vMars = vScale(vSun, -0.5);

  return {
    name: 'FIGURE-8 ORBIT',
    masses: [1, 1, 1],
    radii: [0.22, 0.15, 0.12],
    state: {
      pos: [pSun, pEarth, pMars],
      vel: [vSun, vEarth, vMars],
    },
  };
}

/**
 * Hierarchical Triple system (Central Stellar Primary + inner planet + outer tertiary)
 */
export function presetHierarchicalTriple() {
  return {
    name: 'HIERARCHICAL TRIPLE',
    masses: [2.5, 0.4, 0.1],
    radii: [0.24, 0.14, 0.10],
    state: {
      pos: [
        [0, 0, 0],
        [0.85, 0, 0],
        [2.6, 0.4, 0.3],
      ],
      vel: [
        [0, -0.15, 0],
        [0, 1.72, 0],
        [-0.08, 0.96, 0.02],
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
    masses: [1.2, 1.0, 0.8],
    radii: [0.22, 0.14, 0.11],
    state: {
      pos: [
        [0, 0, 0],
        [1.2, 0, 0.2],
        [-0.9, 0.8, -0.2],
      ],
      vel: [
        [0.05, 0.05, 0],
        [-0.4, 0.65, 0.05],
        [0.3, -0.75, -0.05],
      ],
    },
  };
}

/**
 * Restricted Three-Body regime
 */
export function presetRestrictedThreeBody() {
  return {
    name: 'RESTRICTED THREE-BODY',
    masses: [2.0, 0.8, 0.001],
    radii: [0.24, 0.14, 0.09],
    state: {
      pos: [
        [-0.3, 0, 0],
        [0.6, 0, 0],
        [0, 2.2, 0.3],
      ],
      vel: [
        [0, -0.38, 0],
        [0, 0.72, 0],
        [-0.35, 0, 0.015],
      ],
    },
  };
}

export const PRESETS = {
  solarSystem: presetSolarSystem,
  figureEight: presetFigureEight,
  hierarchical: presetHierarchicalTriple,
  chaos: presetUnstableChaos,
  restricted: presetRestrictedThreeBody,
};
