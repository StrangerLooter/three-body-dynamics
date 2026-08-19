import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BODY_COLORS,
  BODY_MODELS,
  BODY_ROT_SPEED,
} from '../constants/bodies.js';

export class CelestialRenderer {
  constructor(scene, initialRadii = [0.18, 0.14, 0.12]) {
    this.scene = scene;
    this.radii = initialRadii;
    this.bodyGroups = [];
    this.bodyMeshes = []; // Pickable hitboxes for clicking
    this.modelPivots = [null, null, null];
    this.selectionRings = [];
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

      // 1. Invisible Raycasting Hitbox for precision click & selection
      const hitGeo = new THREE.SphereGeometry(radius * 1.2, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        visible: false,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { bodyIndex: i };
      group.add(hitMesh);
      this.bodyMeshes.push(hitMesh);

      // 2. High-performance Fallback Sphere (visible during loading)
      const fallbackGeo = new THREE.SphereGeometry(radius, 32, 32);
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: BODY_COLORS[i],
        roughness: 0.7,
        metalness: 0.1,
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      group.add(fallbackMesh);

      // 3. Crisp, Realistic 3D Model Loading (Supports local /public path or external CDN embed URL)
      const modelPath = BODY_MODELS[i];
      if (modelPath) {
        gltfLoader.load(
          modelPath,
          (gltf) => {
            // Remove loading placeholder cleanly
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

            // Center internal geometry at origin
            model.position.set(
              -center.x * targetScale,
              -center.y * targetScale,
              -center.z * targetScale
            );
            model.scale.setScalar(targetScale);

            // Pivot group for smooth axial self-rotation
            const pivot = new THREE.Group();
            pivot.add(model);
            group.add(pivot);
            this.modelPivots[i] = pivot;

            // Traverse and preserve pure photorealistic textures and cloud layers
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData = { bodyIndex: i };

                if (child.material) {
                  const mats = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                  mats.forEach((mat) => {
                    if (!mat) return;
                    // Ensure correct SRGB color space for authentic textures
                    if (mat.map) {
                      mat.map.colorSpace = THREE.SRGBColorSpace;
                    }

                    if (i === 0) {
                      // Sun: Natural solar luminance using its own texture map
                      if (mat.map) {
                        mat.emissiveMap = mat.map;
                        mat.emissive = new THREE.Color(0xffffff);
                        mat.emissiveIntensity = 0.9;
                      }
                    } else {
                      // Earth & Mars: Pure natural PBR planetary surface
                      if (mat.transparent || mat.opacity < 1) {
                        mat.depthWrite = false;
                      }
                      mat.emissive = new THREE.Color(0x000000);
                      mat.emissiveIntensity = 0;
                      mat.roughness = 0.65;
                      mat.metalness = 0.05;
                    }
                    mat.needsUpdate = true;
                  });
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

      // 4. Subtle, Sci-Fi Target Selection Ring (only visible when selected)
      const ringGeo = new THREE.RingGeometry(radius * 1.35, radius * 1.45, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      this.selectionRings.push(ring);
    }
  }

  update(frameDt, state, selectedIdx) {
    this.clock += frameDt;

    for (let i = 0; i < 3; i++) {
      const p = state.pos[i];
      const group = this.bodyGroups[i];
      const pivot = this.modelPivots[i];
      const ring = this.selectionRings[i];

      if (group) {
        group.position.set(p[0], p[1], p[2]);

        const isSel = selectedIdx === i;
        if (ring) {
          ring.material.opacity = isSel ? 0.75 : 0;
          if (isSel) {
            ring.rotation.z += frameDt * 0.8;
          }
        }
      }

      if (pivot) {
        pivot.rotation.y += BODY_ROT_SPEED[i] * frameDt;
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
  }
}
