import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BODY_COLORS,
  BODY_HEX,
  BODY_MODELS,
  BODY_ROT_SPEED,
} from '../constants/bodies.js';
import { createAtmosphereMesh } from './shaders/AtmosphereShader.js';

export class CelestialRenderer {
  constructor(scene, initialRadii = [0.18, 0.14, 0.12]) {
    this.scene = scene;
    this.radii = initialRadii;
    this.bodyGroups = [];
    this.bodyMeshes = []; // Pickable hitboxes
    this.modelPivots = [null, null, null];
    this.atmosphereMeshes = [];
    this.glowMeshes = [];
    this.clock = 0;

    this.initBodies();
  }

  initBodies() {
    const gltfLoader = new GLTFLoader();

    for (let i = 0; i < 3; i++) {
      const radius = this.radii[i] || 0.15;
      const group = new THREE.Group();
      this.scene.add(group);
      this.bodyGroups.push(group);

      // 1. Invisible Raycasting Hitbox for reliable click & hover detection
      const hitGeo = new THREE.SphereGeometry(radius * 1.25, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        visible: false,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { bodyIndex: i };
      group.add(hitMesh);
      this.bodyMeshes.push(hitMesh);

      // 2. High-performance Fallback / Loading Sphere Placeholder
      const fallbackGeo = new THREE.SphereGeometry(radius, 32, 32);
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: BODY_COLORS[i],
        emissive: BODY_COLORS[i],
        emissiveIntensity: i === 0 ? 0.75 : 0.2,
        roughness: 0.55,
        metalness: 0.15,
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      group.add(fallbackMesh);

      // 3. Load Real 3D GLB Model
      const modelPath = BODY_MODELS[i];
      if (modelPath) {
        gltfLoader.load(
          modelPath,
          (gltf) => {
            // Remove temporary fallback placeholder
            group.remove(fallbackMesh);
            fallbackGeo.dispose();
            fallbackMat.dispose();

            const model = gltf.scene;

            // Compute exact bounding dimensions
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            // Target diameter is radius * 2
            const targetScale = (radius * 2) / maxDim;

            // Center internal geometry at (0,0,0) of pivot
            model.position.set(
              -center.x * targetScale,
              -center.y * targetScale,
              -center.z * targetScale
            );
            model.scale.setScalar(targetScale);

            // Pivot group for smooth planetary self-rotation
            const pivot = new THREE.Group();
            pivot.add(model);
            group.add(pivot);
            this.modelPivots[i] = pivot;

            // Traverse and enhance material aesthetics
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData = { bodyIndex: i };

                if (child.material) {
                  // Ensure correct SRGB color space on textures
                  if (child.material.map) {
                    child.material.map.colorSpace = THREE.SRGBColorSpace;
                  }

                  if (i === 0) {
                    // Sun Stellar Core Glow
                    child.material.emissive = new THREE.Color(0xff8811);
                    child.material.emissiveIntensity = 0.85;
                    child.material.roughness = 0.35;
                  } else {
                    child.material.roughness = 0.65;
                    child.material.metalness = 0.12;
                    child.material.emissive = new THREE.Color(BODY_COLORS[i]);
                    child.material.emissiveIntensity = 0.08;
                  }
                  child.material.needsUpdate = true;
                }
              }
            });
          },
          undefined,
          (err) => {
            console.warn(`Could not load GLB model from ${modelPath}:`, err);
          }
        );
      }

      // 4. Rayleigh Atmospheric Fresnel Glow Rim
      const atmos = createAtmosphereMesh(radius, BODY_HEX[i], 0.95, 2.3);
      this.scene.add(atmos);
      this.atmosphereMeshes.push(atmos);

      // 5. Additive Neon Aura Outer Halo
      const glowGeo = new THREE.SphereGeometry(radius * 1.55, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: i === 0 ? 0.35 : 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);
      this.glowMeshes.push(glow);
    }
  }

  update(frameDt, state, selectedIdx, showAtmosphere = true) {
    this.clock += frameDt;

    for (let i = 0; i < 3; i++) {
      const p = state.pos[i];
      const group = this.bodyGroups[i];
      const atmos = this.atmosphereMeshes[i];
      const pivot = this.modelPivots[i];
      const glow = this.glowMeshes[i];

      if (group) {
        group.position.set(p[0], p[1], p[2]);

        const isSel = selectedIdx === i;
        group.scale.setScalar(isSel ? 1.15 : 1.0);

        if (glow) {
          glow.material.opacity = isSel
            ? 0.45
            : i === 0
            ? 0.32
            : 0.16;
        }
      }

      if (pivot) {
        pivot.rotation.y += BODY_ROT_SPEED[i] * frameDt;
      }

      if (atmos) {
        atmos.position.set(p[0], p[1], p[2]);
        atmos.visible = showAtmosphere;
      }
    }
  }

  dispose() {
    this.bodyGroups.forEach((g) => {
      this.scene.remove(g);
      g.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.atmosphereMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    });
  }
}
