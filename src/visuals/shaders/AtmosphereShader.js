import * as THREE from 'three';

export const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float intensity;
    uniform float power;
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, -vPositionNormal)), power);
      gl_FragColor = vec4(color, fresnel * intensity);
    }
  `,
};

export function createAtmosphereMesh(radius, colorHex, intensity = 0.85, power = 2.6) {
  const geo = new THREE.SphereGeometry(radius * 1.28, 32, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: AtmosphereShader.vertexShader,
    fragmentShader: AtmosphereShader.fragmentShader,
    uniforms: {
      color: { value: new THREE.Color(colorHex) },
      intensity: { value: intensity },
      power: { value: power },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}
