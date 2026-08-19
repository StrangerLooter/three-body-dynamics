import * as THREE from 'three';

export const StarPlasmaShader = {
  vertexShader: `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      // Subtle organic surface turbulence
      float displacement = sin(position.x * 12.0 + time * 3.0) * cos(position.y * 12.0 + time * 2.5) * 0.015;
      vec3 newPos = position + normal * displacement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 coreColor;
    uniform vec3 edgeColor;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    // Simple procedural noise for plasma filaments
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Fresnel edge intensity
      vec3 viewDir = normalize(-vPosition);
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);

      // Plasma filament swirls
      float pattern = sin(vUv.x * 35.0 + time * 2.2) * cos(vUv.y * 35.0 - time * 1.8);
      pattern += sin((vUv.x + vUv.y) * 20.0 + time * 1.5) * 0.5;

      vec3 color = mix(coreColor, edgeColor, clamp(fresnel + pattern * 0.25, 0.0, 1.0));
      color += edgeColor * fresnel * 0.8;

      gl_FragColor = vec4(color, 0.95);
    }
  `,
};

export function createStarMesh(radius, coreHex, edgeHex) {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const mat = new THREE.ShaderMaterial({
    vertexShader: StarPlasmaShader.vertexShader,
    fragmentShader: StarPlasmaShader.fragmentShader,
    uniforms: {
      time: { value: 0 },
      coreColor: { value: new THREE.Color(coreHex) },
      edgeColor: { value: new THREE.Color(edgeHex) },
    },
    transparent: true,
  });
  return new THREE.Mesh(geo, mat);
}
