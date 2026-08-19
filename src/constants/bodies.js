export const BODY_COLORS = [0xffbe40, 0x48c0ff, 0xff5733]; // Sun (Amber), Earth (Ocean Cyan), Mars (Rust Red)
export const BODY_HEX = ['#ffbe40', '#48c0ff', '#ff5733'];
export const BODY_NAMES = ['BODY 01 (Sun)', 'BODY 02 (Earth)', 'BODY 03 (Mars)'];

// 3D GLTF / GLB Models in public/models/ or CDN URLs
export const BODY_MODELS = [
  '/models/sun.glb',
  '/models/earth_-_16k_high_resolution.glb',
  '/models/mars.glb',
];

// Fallback high-resolution planetary textures
export const BODY_TEXTURES = [
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg',
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
];

export const BODY_ROT_SPEED = [0.05, 0.14, 0.11]; // rad/s, self-rotation
export const TRAIL_LENGTH = 600;
