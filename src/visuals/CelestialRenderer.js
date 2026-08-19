import * as THREE from 'three';
import { BODY_COLORS, BODY_HEX, BODY_TEXTURES, BODY_ROT_SPEED } from '../constants/bodies.js';
import { createAtmosphereMesh } from './shaders/AtmosphereShader.js';
import { createStarMesh } from './shaders/StarPlasmaShader.js';

export class CelestialRenderer {
  constructor(scene, initialRadii = [0.16, 0.16, 0.12]) {
    this.scene = scene;
    this.bodyMeshes = [];
    this.atmosphereMeshes = [];
    this.coronaMeshes = [];
    this.radii = initialRadii;
    this.clock = 0;

    this.initBodies();
  }

  initBodies() {
    const textureLoader = new THREE.TextureLoader();

    // Body 0: Glowing Blue Plasma Star / Primary
    const r0 = this.radii[0] || 0.16;
    const mesh0 = createStarMesh(r0, 0x38bdf8, 0x0284c7);
    this.scene.add(mesh0);
    this.bodyMeshes.push(mesh0);

    const atmos0 = createAtmosphereMesh(r0, '#38bdf8', 0.9, 2.2);
    this.scene.add(atmos0);
    this.atmosphereMeshes.push(atmos0);

    // Body 1: Burning Orange Solar Corona Star / Secondary
    const r1 = this.radii[1] || 0.16;
    const mesh1 = createStarMesh(r1, 0xf97316, 0xef4444);
    this.scene.add(mesh1);
    this.bodyMeshes.push(mesh1);

    const atmos1 = createAtmosphereMesh(r1, '#f97316', 0.9, 2.2);
    this.scene.add(atmos1);
    this.atmosphereMeshes.push(atmos1);

    // Body 2: Photorealistic Terrestrial / Moon Planet / Tertiary
    const r2 = this.radii[2] || 0.12;
    const geo2 = new THREE.SphereGeometry(r2, 48, 48);
    const mat2 = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: BODY_COLORS[2],
      emissiveIntensity: 0.12,
      roughness: 0.75,
      metalness: 0.1,
    });

    textureLoader.load(
      BODY_TEXTURES[1] || BODY_TEXTURES[2],
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat2.map = tex;
        mat2.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    const mesh2 = new THREE.Mesh(geo2, mat2);
    this.scene.add(mesh2);
    this.bodyMeshes.push(mesh2);

    const atmos2 = createAtmosphereMesh(r2, '#ffcf7a', 0.6, 2.8);
    this.scene.add(atmos2);
    this.atmosphereMeshes.push(atmos2);

    // Subtle ambient glow halos for all 3 bodies
    this.bodyMeshes.forEach((mesh, i) => {
      const glowGeo = new THREE.SphereGeometry((this.radii[i] || 0.15) * 1.8, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);
    });
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

        // Update plasma shader time uniform for stars
        if (mesh.material?.uniforms?.time) {
          mesh.material.uniforms.time.value = this.clock;
        }

        const isSel = selectedIdx === i;
        mesh.scale.setScalar(isSel ? 1.18 : 1.0);
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
