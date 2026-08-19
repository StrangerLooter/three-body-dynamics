import * as THREE from 'three';
import { BODY_COLORS, BODY_HEX, BODY_TEXTURES, BODY_ROT_SPEED } from '../constants/bodies.js';
import { createAtmosphereMesh } from './shaders/AtmosphereShader.js';

export class CelestialRenderer {
  constructor(scene, initialRadii = [0.16, 0.14, 0.11]) {
    this.scene = scene;
    this.bodyMeshes = [];
    this.atmosphereMeshes = [];
    this.glowMeshes = [];
    this.radii = initialRadii;
    this.clock = 0;

    this.initBodies();
  }

  initBodies() {
    const textureLoader = new THREE.TextureLoader();

    for (let i = 0; i < 3; i++) {
      const radius = this.radii[i] || 0.15;
      const geo = new THREE.SphereGeometry(radius, 48, 48);

      // Realistic planetary surface material with neon emissive accent
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: BODY_COLORS[i],
        emissiveIntensity: 0.22,
        roughness: 0.6,
        metalness: 0.15,
      });

      // Load high-res planetary texture map
      if (BODY_TEXTURES[i]) {
        textureLoader.load(
          BODY_TEXTURES[i],
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.emissiveIntensity = 0.12;
            mat.needsUpdate = true;
          },
          undefined,
          () => {}
        );
      }

      const mesh = new THREE.Mesh(geo, mat);
      this.scene.add(mesh);
      this.bodyMeshes.push(mesh);

      // 1. Neon Rayleigh Atmospheric Fresnel Glow Rim
      const atmos = createAtmosphereMesh(radius, BODY_HEX[i], 0.95, 2.4);
      this.scene.add(atmos);
      this.atmosphereMeshes.push(atmos);

      // 2. High-intensity neon aura halo (Additive blending)
      const glowGeo = new THREE.SphereGeometry(radius * 1.65, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);
      this.glowMeshes.push(glow);

      // 3. Inner neon core glow
      const innerGlowGeo = new THREE.SphereGeometry(radius * 1.15, 24, 24);
      const innerGlowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
      mesh.add(innerGlow);
    }
  }

  update(frameDt, state, selectedIdx, showAtmosphere = true) {
    this.clock += frameDt;

    for (let i = 0; i < 3; i++) {
      const p = state.pos[i];
      const mesh = this.bodyMeshes[i];
      const atmos = this.atmosphereMeshes[i];

      if (mesh) {
        mesh.position.set(p[0], p[1], p[2]);
        mesh.rotation.y += BODY_ROT_SPEED[i] * frameDt;

        const isSel = selectedIdx === i;
        mesh.scale.setScalar(isSel ? 1.18 : 1.0);
        mesh.material.emissiveIntensity = isSel ? 0.45 : mesh.material.map ? 0.12 : 0.22;
      }

      if (atmos) {
        atmos.position.set(p[0], p[1], p[2]);
        atmos.visible = showAtmosphere;
      }
    }
  }

  dispose() {
    this.bodyMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    });
    this.atmosphereMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    });
  }
}
