/**
 * Pure 3D Vector Math operations with zero Three.js / React dependency.
 */

export const SOFTENING = 1e-4; // epsilon^2 term — prevents division-by-zero singularities

export const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const vScale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

export const vDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const vLen = (a) => Math.sqrt(vDot(a, a));

export const vCross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
