export const BODY_COLORS = [0xffbe40, 0xe2b078, 0xff5733]; // Sun (Solar Amber), Jupiter (Banded Ochre), Mars (Rust Red)
export const BODY_HEX = ['#ffbe40', '#e2b078', '#ff5733'];
export const BODY_NAMES = ['BODY 01 (Sun)', 'BODY 02 (Jupiter)', 'BODY 03 (Mars)'];

// 3D GLTF / GLB Models in public/models/ or CDN URLs
export const BODY_MODELS = [
  '/models/sun.glb',
  '/models/realistic_jupiter.glb',
  '/models/mars.glb',
];

// Fallback high-resolution planetary textures
export const BODY_TEXTURES = [
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
];

export const BODY_ROT_SPEED = [0.05, 0.08, 0.11]; // rad/s, self-rotation
export const TRAIL_LENGTH = 1200;
