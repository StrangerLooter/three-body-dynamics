import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import {
  integrateStep,
  stepDoubling,
  computeEnergy,
  computeMomentum,
  computeAngularMomentum,
  computeCOM,
  computePairDistances,
  computeSeparation,
  computeFieldAt,
  computePotentialAt,
  computeAccelerations,
  minPairDistance,
  vLen,
  vDot,
  vScale,
} from '../physics/index.js';
import {
  BODY_COLORS,
  BODY_TEXTURES,
  BODY_ROT_SPEED,
  TRAIL_LENGTH,
} from '../constants/bodies.js';

function buildStarfield() {
  const layers = new THREE.Group();
  const specs = [
    { count: 2200, radius: 60, size: 0.09, color: 0x6f7f9f, opacity: 0.55 },
    { count: 1200, radius: 40, size: 0.13, color: 0x9fb3d9, opacity: 0.8 },
    { count: 400, radius: 25, size: 0.19, color: 0xe8eefc, opacity: 1.0 },
  ];
  specs.forEach((s) => {
    const positions = new Float32Array(s.count * 3);
    for (let i = 0; i < s.count; i++) {
      const r = s.radius * (0.4 + 0.6 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: s.color,
      size: s.size,
      transparent: true,
      opacity: s.opacity,
      sizeAttenuation: true,
      depthWrite: false,
    });
    layers.add(new THREE.Points(geo, mat));
  });
  return layers;
}

export function useThreeSimulation({
  entered,
  simRef,
  sysBRef,
  historyRef,
  camStateRef,
  labelRefs,
  onSelectBody,
  onCamModeChange,
  onTelemetryUpdate,
  onChartTick,
  onWebglError,
}) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const bodyMeshesRef = useRef([]);
  const bodyMeshesBRef = useRef([]);
  const trailLinesRef = useRef([]);
  const trailBuffersRef = useRef([]);
  const comMarkerRef = useRef(null);
  const gridRef = useRef(null);
  const spacetimeGridRef = useRef(null);
  const axesHelperRef = useRef(null);
  const arrowsRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());

  const fieldLinesRef = useRef(null);
  const fieldVectorsRef = useRef(null);
  const fieldPotentialRef = useRef(null);
  const fieldParticlesRef = useRef(null);
  const fieldParticleDataRef = useRef([]);

  const dragRef = useRef({ dragging: false, panning: false, lastX: 0, lastY: 0, moved: 0 });
  const clickRef = useRef({ time: 0, index: -1 });

  useEffect(() => {
    if (!entered || !mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.028);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.05,
      200
    );
    cameraRef.current = camera;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch (e) {
      onWebglError?.();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x02040a, 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x30405f, 1.1));
    const key = new THREE.PointLight(0xffffff, 1.4, 0, 2);
    key.position.set(4, 5, 6);
    scene.add(key);

    // Starfield
    scene.add(buildStarfield());

    // Coordinate grid
    const grid = new THREE.GridHelper(10, 20, 0x1c2b45, 0x121c30);
    grid.position.y = -2.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);
    gridRef.current = grid;

    // Spacetime fabric mesh (26x26)
    const ST_N = 26;
    const ST_EXTENT = 4.2;
    const ST_BASE_Y = -1.9;
    const stPos = new Float32Array(ST_N * ST_N * 3);
    for (let ix = 0; ix < ST_N; ix++) {
      for (let iz = 0; iz < ST_N; iz++) {
        const x = (ix / (ST_N - 1) - 0.5) * 2 * ST_EXTENT;
        const z = (iz / (ST_N - 1) - 0.5) * 2 * ST_EXTENT;
        const idx = (ix * ST_N + iz) * 3;
        stPos[idx] = x;
        stPos[idx + 1] = ST_BASE_Y;
        stPos[idx + 2] = z;
      }
    }
    const stIndices = [];
    for (let ix = 0; ix < ST_N; ix++) {
      for (let iz = 0; iz < ST_N; iz++) {
        const i = ix * ST_N + iz;
        if (ix < ST_N - 1) stIndices.push(i, i + ST_N);
        if (iz < ST_N - 1) stIndices.push(i, i + 1);
      }
    }
    const stGeo = new THREE.BufferGeometry();
    stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
    stGeo.setIndex(stIndices);
    const stMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
    });
    const spacetimeGrid = new THREE.LineSegments(stGeo, stMat);
    spacetimeGrid.visible = false;
    scene.add(spacetimeGrid);
    spacetimeGridRef.current = spacetimeGrid;

    // Axes
    const axes = new THREE.AxesHelper(2.2);
    axes.visible = false;
    scene.add(axes);
    axesHelperRef.current = axes;

    // Planet Spheres & Trails
    const sim = simRef.current;
    bodyMeshesRef.current = [];
    trailLinesRef.current = [];
    trailBuffersRef.current = [];
    arrowsRef.current = [];
    const textureLoader = new THREE.TextureLoader();

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(sim.radii[i] || 0.15, 48, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: BODY_COLORS[i],
        emissiveIntensity: 0.12,
        roughness: 0.75,
        metalness: 0.05,
      });

      // Load planetary textures asynchronously
      textureLoader.load(
        BODY_TEXTURES[i],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.emissiveIntensity = 0.08;
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          // Fallback to emissive flat color on load error
        }
      );

      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      bodyMeshesRef.current.push(mesh);

      // Glow halo
      const glowGeo = new THREE.SphereGeometry((sim.radii[i] || 0.15) * 1.9, 20, 20);
      const glowMat = new THREE.MeshBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);

      // Pre-allocated trail buffers
      const arr = new Float32Array(TRAIL_LENGTH * 3);
      const tgeo = new THREE.BufferGeometry();
      tgeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      tgeo.setDrawRange(0, 0);
      const tmat = new THREE.LineBasicMaterial({
        color: BODY_COLORS[i],
        transparent: true,
        opacity: 0.55,
      });
      const line = new THREE.Line(tgeo, tmat);
      scene.add(line);
      trailLinesRef.current.push(line);
      trailBuffersRef.current.push({ arr, count: 0 });

      // Velocity Arrow Helper
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        0.001,
        BODY_COLORS[i],
        0.06,
        0.04
      );
      arrow.visible = false;
      scene.add(arrow);
      arrowsRef.current.push(arrow);
    }

    // Center of Mass Marker
    const comGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const comMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const comMesh = new THREE.Mesh(comGeo, comMat);
    scene.add(comMesh);
    comMarkerRef.current = comMesh;

    // Chaos Lab Twin System "Ghost" Meshes
    const bMeshes = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry((sim.radii[i] || 0.15) * 0.85, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      bMeshes.push(mesh);
    }
    bodyMeshesBRef.current = bMeshes;

    // Gravitational Field Visualization Elements
    const FIELD_N = 12;
    const FIELD_EXTENT = 3.6;
    const fieldGridPoints = [];
    for (let ix = 0; ix < FIELD_N; ix++) {
      for (let iy = 0; iy < FIELD_N; iy++) {
        const x = (ix / (FIELD_N - 1) - 0.5) * 2 * FIELD_EXTENT;
        const y = (iy / (FIELD_N - 1) - 0.5) * 2 * FIELD_EXTENT;
        fieldGridPoints.push([x, y, 0]);
      }
    }
    const gridCount = fieldGridPoints.length;

    // Field Lines
    const linesPos = new Float32Array(gridCount * 2 * 3);
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(linesPos, 3));
    const linesMat = new THREE.LineBasicMaterial({
      color: 0x6fd3ff,
      transparent: true,
      opacity: 0.28,
    });
    const fieldLines = new THREE.LineSegments(linesGeo, linesMat);
    fieldLines.visible = false;
    scene.add(fieldLines);
    fieldLinesRef.current = fieldLines;

    // Field Vectors
    const vecPos = new Float32Array(gridCount * 2 * 3);
    const vecGeo = new THREE.BufferGeometry();
    vecGeo.setAttribute('position', new THREE.BufferAttribute(vecPos, 3));
    const vecMat = new THREE.LineBasicMaterial({
      color: 0xb98cff,
      transparent: true,
      opacity: 0.5,
    });
    const fieldVectors = new THREE.LineSegments(vecGeo, vecMat);
    fieldVectors.visible = false;
    scene.add(fieldVectors);
    fieldVectorsRef.current = fieldVectors;

    // Potential Contours
    const potPos = new Float32Array(gridCount * 3);
    const potCol = new Float32Array(gridCount * 3);
    fieldGridPoints.forEach((p, i) => {
      potPos[i * 3] = p[0];
      potPos[i * 3 + 1] = p[1];
      potPos[i * 3 + 2] = p[2];
    });
    const potGeo = new THREE.BufferGeometry();
    potGeo.setAttribute('position', new THREE.BufferAttribute(potPos, 3));
    potGeo.setAttribute('color', new THREE.BufferAttribute(potCol, 3));
    const potMat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const fieldPotential = new THREE.Points(potGeo, potMat);
    fieldPotential.visible = false;
    scene.add(fieldPotential);
    fieldPotentialRef.current = fieldPotential;

    // Particle Flow Tracers
    const PARTICLE_COUNT = 220;
    const partPos = new Float32Array(PARTICLE_COUNT * 3);
    const particleData = [];
    function respawnParticle(i) {
      const x = (Math.random() - 0.5) * 2 * FIELD_EXTENT;
      const y = (Math.random() - 0.5) * 2 * FIELD_EXTENT;
      const z = (Math.random() - 0.5) * 1.4;
      partPos[i * 3] = x;
      partPos[i * 3 + 1] = y;
      partPos[i * 3 + 2] = z;
    }
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      respawnParticle(i);
      particleData.push(0);
    }
    fieldParticleDataRef.current = particleData;
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
      size: 0.045,
      color: 0xffcf7a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const fieldParticles = new THREE.Points(partGeo, partMat);
    fieldParticles.visible = false;
    scene.add(fieldParticles);
    fieldParticlesRef.current = fieldParticles;

    sim.initialEnergy = computeEnergy(sim.state, sim.masses, sim.G).total;

    function pushTrailSample() {
      for (let i = 0; i < 3; i++) {
        const buf = trailBuffersRef.current[i];
        if (!buf) continue;
        const idx = (buf.count % TRAIL_LENGTH) * 3;
        buf.arr[idx] = sim.state.pos[i][0];
        buf.arr[idx + 1] = sim.state.pos[i][1];
        buf.arr[idx + 2] = sim.state.pos[i][2];
        buf.count++;
      }
    }

    // Pointer & Orbit Interaction Handlers
    const dom = renderer.domElement;

    function pickBodyAt(clientX, clientY) {
      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      const hits = raycasterRef.current.intersectObjects(bodyMeshesRef.current);
      if (hits.length) return bodyMeshesRef.current.indexOf(hits[0].object);
      return -1;
    }

    const onPointerDown = (e) => {
      dragRef.current.dragging = true;
      dragRef.current.panning = e.button === 2 || e.shiftKey;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      dragRef.current.moved = 0;
    };

    const onPointerUp = (e) => {
      const wasDrag = dragRef.current.dragging;
      const moved = dragRef.current.moved;
      const wasPanning = dragRef.current.panning;
      dragRef.current.dragging = false;

      if (wasDrag && !wasPanning && moved < 6) {
        const idx = pickBodyAt(e.clientX, e.clientY);
        if (idx >= 0) {
          const now = performance.now();
          const isDbl = now - clickRef.current.time < 400 && clickRef.current.index === idx;
          clickRef.current = { time: now, index: idx };
          simRef.current.selected = idx;
          onSelectBody?.(idx);

          if (isDbl) {
            camStateRef.current.mode = 'body' + idx;
            onCamModeChange?.('body' + idx);
          }
        }
      }
    };

    const onPointerMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      dragRef.current.moved += Math.abs(dx) + Math.abs(dy);
      const cs = camStateRef.current;

      if (dragRef.current.panning) {
        const panScale = cs.dist * 0.0016;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const right = new THREE.Vector3().crossVectors(camDir, camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, camDir).normalize();
        cs.target.addScaledVector(right, -dx * panScale);
        cs.target.addScaledVector(up, dy * panScale);
        if (cs.mode !== 'free') {
          cs.mode = 'free';
          onCamModeChange?.('free');
        }
      } else {
        cs.theta -= dx * 0.006;
        cs.phi -= dy * 0.006;
        cs.phi = Math.max(0.12, Math.min(Math.PI - 0.12, cs.phi));
        if (['top', 'front', 'side', 'auto'].includes(cs.mode)) {
          cs.mode = 'free';
          onCamModeChange?.('free');
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const cs = camStateRef.current;
      cs.dist *= 1 + e.deltaY * 0.001;
      cs.dist = Math.max(1.2, Math.min(40, cs.dist));
    };

    const onContextMenu = (e) => e.preventDefault();

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    // Main Simulation & Animation Loop
    let raf = 0;
    let lastFrameT = performance.now();
    let uiAccum = 0;
    let frameAccum = 0;
    let frameCount = 0;
    let fps = 60;
    let chartAccum = 0;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const frameDt = Math.min((now - lastFrameT) / 1000, 0.05);
      lastFrameT = now;
      frameCount++;
      frameAccum += frameDt;
      if (frameAccum >= 0.5) {
        fps = frameCount / frameAccum;
        frameCount = 0;
        frameAccum = 0;
      }

      const s = simRef.current;

      if (s.running) {
        let remaining = frameDt * s.speed;
        let substeps = 0;
        while (remaining > 0 && substeps < 400) {
          substeps++;

          if (s.adaptiveOn) {
            const { result, err } = stepDoubling(s.state, s.masses, s.G, s.dt);
            if (err > s.tolerance && s.dt > s.dtMin + 1e-9) {
              s.dt = Math.max(s.dtMin, s.dt * 0.5);
              continue;
            }
            const usedDt = s.dt;
            s.state = result;
            s.simTime += usedDt;
            remaining -= usedDt;
            if (err < s.tolerance * 0.15) s.dt = Math.min(s.dtMax, s.dt * 1.4);
            if (s.chaosOn && sysBRef.current) {
              sysBRef.current.state = integrateStep(
                sysBRef.current.state,
                s.masses,
                s.G,
                usedDt,
                s.integrator
              );
            }
            pushTrailSample();
          } else {
            const minD = minPairDistance(s.state);
            const closeFactor = minD < 0.08 ? Math.max(0.05, minD / 0.08) : 1;
            const h = Math.min(s.dt * closeFactor, remaining);
            s.state = integrateStep(s.state, s.masses, s.G, h, s.integrator);
            s.simTime += h;
            remaining -= h;
            if (s.chaosOn && sysBRef.current) {
              sysBRef.current.state = integrateStep(
                sysBRef.current.state,
                s.masses,
                s.G,
                h,
                s.integrator
              );
            }
            pushTrailSample();
          }
        }

        const minD2 = minPairDistance(s.state);
        if (!Number.isFinite(minD2) || s.state.pos.some((p) => p.some((c) => !Number.isFinite(c)))) {
          s.running = false;
          s.numericalWarning = 'NUMERICAL INSTABILITY DETECTED — reduce dt or switch to RK4.';
        } else if (minD2 < 0.05) {
          s.numericalWarning = 'CLOSE ENCOUNTER — timestep softened.';
        } else {
          s.numericalWarning = null;
        }
      }

      // Sync Body Meshes
      for (let i = 0; i < 3; i++) {
        const p = s.state.pos[i];
        if (bodyMeshesRef.current[i]) {
          bodyMeshesRef.current[i].position.set(p[0], p[1], p[2]);
          bodyMeshesRef.current[i].rotation.y += BODY_ROT_SPEED[i] * frameDt;
          const isSel = s.selected === i;
          bodyMeshesRef.current[i].material.emissiveIntensity = isSel
            ? 0.4
            : bodyMeshesRef.current[i].material.map
            ? 0.08
            : 0.12;
          bodyMeshesRef.current[i].scale.setScalar(isSel ? 1.18 : 1.0);
        }
      }

      // Sync Chaos Twin Meshes
      if (s.chaosOn && sysBRef.current) {
        const sepNow = computeSeparation(s.state, sysBRef.current.state);
        if (Number.isFinite(sepNow)) s.chaosMaxSep = Math.max(s.chaosMaxSep, sepNow);
        for (let i = 0; i < 3; i++) {
          const p = sysBRef.current.state.pos[i];
          const finite = p.every(Number.isFinite);
          if (bodyMeshesBRef.current[i]) {
            bodyMeshesBRef.current[i].visible = finite;
            if (finite) bodyMeshesBRef.current[i].position.set(p[0], p[1], p[2]);
          }
        }
      } else {
        bodyMeshesBRef.current.forEach((m) => {
          if (m) m.visible = false;
        });
      }

      const com = computeCOM(s.state, s.masses);
      if (comMarkerRef.current) {
        comMarkerRef.current.position.set(com[0], com[1], com[2]);
        comMarkerRef.current.visible = s.showCOM;
      }
      if (gridRef.current) gridRef.current.visible = s.showGrid;
      if (spacetimeGridRef.current) spacetimeGridRef.current.visible = s.showSpacetime;
      if (axesHelperRef.current) axesHelperRef.current.visible = s.showAxes;

      // Sync Gravitational Field Views
      if (fieldLinesRef.current) fieldLinesRef.current.visible = s.fieldMode === 'lines';
      if (fieldVectorsRef.current) fieldVectorsRef.current.visible = s.fieldMode === 'vectors';
      if (fieldPotentialRef.current) fieldPotentialRef.current.visible = s.fieldMode === 'potential';
      if (fieldParticlesRef.current) fieldParticlesRef.current.visible = s.fieldMode === 'particles';

      if (s.fieldMode === 'particles' && fieldParticlesRef.current) {
        const posAttr = fieldParticlesRef.current.geometry.attributes.position;
        const arr = posAttr.array;
        const pdata = fieldParticleDataRef.current;
        const advectDt = Math.min(frameDt, 0.05) * 2.2;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const px = arr[i * 3];
          const py = arr[i * 3 + 1];
          const pz = arr[i * 3 + 2];
          const fld = computeFieldAt([px, py, pz], s.state.pos, s.masses, s.G);
          const speed2 = vDot(fld, fld);
          const dist2Center = px * px + py * py + pz * pz;
          pdata[i] += frameDt;
          const tooFast = speed2 > 400;
          const tooFar = dist2Center > FIELD_EXTENT * 1.6 * (FIELD_EXTENT * 1.6);
          const expired = pdata[i] > 9;
          if (tooFast || tooFar || expired) {
            respawnParticle(i);
            pdata[i] = 0;
          } else {
            arr[i * 3] += fld[0] * advectDt;
            arr[i * 3 + 1] += fld[1] * advectDt;
            arr[i * 3 + 2] += fld[2] * advectDt;
          }
        }
        posAttr.needsUpdate = true;
      }

      // Sync Trails
      if (s.trailsOn) {
        for (let i = 0; i < 3; i++) {
          const buf = trailBuffersRef.current[i];
          const line = trailLinesRef.current[i];
          if (line && buf) {
            line.visible = true;
            const n = Math.min(buf.count, TRAIL_LENGTH);
            line.geometry.attributes.position.needsUpdate = true;
            line.geometry.setDrawRange(0, n);
          }
        }
      } else {
        trailLinesRef.current.forEach((l) => {
          if (l) l.visible = false;
        });
      }

      // Sync Velocity Vectors
      if (s.showVectors) {
        for (let i = 0; i < 3; i++) {
          const arrow = arrowsRef.current[i];
          if (!arrow) continue;
          const p = s.state.pos[i];
          const v = s.state.vel[i];
          const speed = vLen(v);
          arrow.visible = speed > 1e-6;
          if (arrow.visible) {
            arrow.position.set(p[0], p[1], p[2]);
            const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
            arrow.setDirection(dir);
            const len = Math.min(1.4, Math.max(0.08, speed * 0.4));
            arrow.setLength(len, len * 0.28, len * 0.16);
          }
        }
      } else {
        arrowsRef.current.forEach((a) => {
          if (a) a.visible = false;
        });
      }

      // Direct DOM label positioning
      if (s.showLabels && labelRefs?.current) {
        for (let i = 0; i < 3; i++) {
          const el = labelRefs.current[i];
          if (!el || !bodyMeshesRef.current[i]) continue;
          const p = bodyMeshesRef.current[i].position.clone();
          p.project(camera);
          const x = (p.x * 0.5 + 0.5) * mount.clientWidth;
          const y = (-p.y * 0.5 + 0.5) * mount.clientHeight;
          const behind = p.z > 1;
          el.style.display = behind ? 'none' : 'block';
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
      } else if (labelRefs?.current) {
        labelRefs.current.forEach((el) => {
          if (el) el.style.display = 'none';
        });
      }

      // Camera Animation / Tracking
      const cs = camStateRef.current;
      if (['body0', 'body1', 'body2'].includes(cs.mode)) {
        const idx = Number(cs.mode.slice(4));
        const p = s.state.pos[idx];
        cs.desiredTarget.set(p[0], p[1], p[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
      } else if (cs.mode === 'com') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
      } else if (cs.mode === 'top') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.phi += (0.12 - cs.phi) * 0.08;
      } else if (cs.mode === 'front') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.theta += (0 - cs.theta) * 0.08;
        cs.phi += (Math.PI / 2 - cs.phi) * 0.08;
      } else if (cs.mode === 'side') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.08);
        cs.theta += (Math.PI / 2 - cs.theta) * 0.08;
        cs.phi += (Math.PI / 2 - cs.phi) * 0.08;
      } else if (cs.mode === 'auto') {
        cs.desiredTarget.set(com[0], com[1], com[2]);
        cs.target.lerp(cs.desiredTarget, 0.05);
        cs.theta += frameDt * 0.18;
      }

      const camX = cs.target.x + cs.dist * Math.sin(cs.phi) * Math.sin(cs.theta);
      const camY = cs.target.y + cs.dist * Math.cos(cs.phi);
      const camZ = cs.target.z + cs.dist * Math.sin(cs.phi) * Math.cos(cs.theta);
      camera.position.set(camX, camY, camZ);
      camera.lookAt(cs.target);

      renderer.render(scene, camera);

      // Throttled UI State & Telemetry Updates (~10 Hz)
      uiAccum += frameDt;
      if (uiAccum > 0.1) {
        uiAccum = 0;
        const energy = computeEnergy(s.state, s.masses, s.G);
        const p = computeMomentum(s.state, s.masses);
        const L = computeAngularMomentum(s.state, s.masses);
        const err = s.initialEnergy
          ? Math.abs((energy.total - s.initialEnergy) / s.initialEnergy)
          : 0;
        const selIdx = s.selected;
        const selPos = s.state.pos[selIdx];
        const selVel = s.state.vel[selIdx];
        const nextIdx = (selIdx + 1) % 3;
        const distNext = vLen([
          s.state.pos[nextIdx][0] - selPos[0],
          s.state.pos[nextIdx][1] - selPos[1],
          s.state.pos[nextIdx][2] - selPos[2],
        ]);
        const distInfo = computePairDistances(s.state);

        // Spacetime fabric mesh potential warp
        if (s.showSpacetime && spacetimeGridRef.current) {
          const arr = spacetimeGridRef.current.geometry.attributes.position.array;
          for (let i = 0; i < ST_N * ST_N; i++) {
            const x = arr[i * 3];
            const z = arr[i * 3 + 2];
            const u = computePotentialAt([x, ST_BASE_Y, z], s.state.pos, s.masses, s.G);
            const depth = Math.max(-1.6, u * 0.55);
            arr[i * 3 + 1] = ST_BASE_Y + depth;
          }
          spacetimeGridRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Gravitational field grid updates
        if (
          (s.fieldMode === 'lines' && fieldLinesRef.current) ||
          (s.fieldMode === 'vectors' && fieldVectorsRef.current)
        ) {
          const target =
            s.fieldMode === 'lines' ? fieldLinesRef.current : fieldVectorsRef.current;
          const arr = target.geometry.attributes.position.array;
          for (let i = 0; i < gridCount; i++) {
            const gp = fieldGridPoints[i];
            const fld = computeFieldAt(gp, s.state.pos, s.masses, s.G);
            const mag = vLen(fld);
            const len =
              s.fieldMode === 'lines'
                ? 0.22
                : Math.min(0.7, 0.06 + Math.log(1 + mag) * 0.22);
            const dir = mag > 1e-9 ? vScale(fld, len / mag) : [0, 0, 0];
            const base = i * 6;
            arr[base] = gp[0];
            arr[base + 1] = gp[1];
            arr[base + 2] = gp[2];
            arr[base + 3] = gp[0] + dir[0];
            arr[base + 4] = gp[1] + dir[1];
            arr[base + 5] = gp[2] + dir[2];
          }
          target.geometry.attributes.position.needsUpdate = true;
        } else if (s.fieldMode === 'potential' && fieldPotentialRef.current) {
          const pot = fieldGridPoints.map((gp) =>
            computePotentialAt(gp, s.state.pos, s.masses, s.G)
          );
          const uMin = Math.min(...pot);
          const uMax = Math.max(...pot);
          const range = uMax - uMin || 1;
          const colArr = fieldPotentialRef.current.geometry.attributes.color.array;
          for (let i = 0; i < gridCount; i++) {
            const t = (pot[i] - uMin) / range;
            colArr[i * 3] = 0.25 + t * 0.55;
            colArr[i * 3 + 1] = 0.35 + t * 0.55;
            colArr[i * 3 + 2] = 0.55 + (1 - t) * 0.35;
          }
          fieldPotentialRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // Chaos Lab Telemetry
        let chaosSep = 0;
        let chaosLyap = null;
        if (s.chaosOn && sysBRef.current) {
          chaosSep = computeSeparation(s.state, sysBRef.current.state);
          const elapsed = s.simTime - s.chaosT0;
          if (elapsed > 1e-6 && s.chaosInitialSep > 0 && chaosSep > 0) {
            chaosLyap = Math.log(chaosSep / s.chaosInitialSep) / elapsed;
          }
        }

        // Rolling history recording
        if (s.running && historyRef.current) {
          const H = historyRef.current;
          const accel = computeAccelerations(s.state.pos, s.masses, s.G);
          H.t.push(s.simTime);
          for (let i = 0; i < 3; i++) {
            H[`p${i}x`].push(s.state.pos[i][0]);
            H[`p${i}y`].push(s.state.pos[i][1]);
            H[`p${i}z`].push(s.state.pos[i][2]);
            H[`v${i}x`].push(s.state.vel[i][0]);
            H[`v${i}y`].push(s.state.vel[i][1]);
            H[`v${i}z`].push(s.state.vel[i][2]);
            H[`a${i}x`].push(accel[i][0]);
            H[`a${i}y`].push(accel[i][1]);
            H[`a${i}z`].push(accel[i][2]);
          }
          H.KE.push(energy.KE);
          H.PE.push(energy.PE);
          H.Etot.push(energy.total);
          H.err.push(err);
          H.Px.push(p[0]);
          H.Py.push(p[1]);
          H.Pz.push(p[2]);
          H.Lx.push(L[0]);
          H.Ly.push(L[1]);
          H.Lz.push(L[2]);
          H.momMag.push(vLen(p));
          H.angMag.push(vLen(L));
          H.comx.push(com[0]);
          H.comy.push(com[1]);
          H.comz.push(com[2]);
          H.d01.push(distInfo.pairs.d01);
          H.d02.push(distInfo.pairs.d02);
          H.d12.push(distInfo.pairs.d12);
          if (s.chaosOn && sysBRef.current) {
            H.chaosT.push(s.simTime - s.chaosT0);
            H.sep.push(chaosSep);
          }
          const MAX_HISTORY = 2000;
          Object.keys(H).forEach((k) => {
            if (H[k].length > MAX_HISTORY) H[k].splice(0, H[k].length - MAX_HISTORY);
          });
        }

        onTelemetryUpdate?.({
          running: s.running,
          simTime: s.simTime,
          fps: Math.round(fps),
          dt: s.dt,
          energy,
          energyError: err,
          momentumMag: vLen(p),
          angMomentumMag: vLen(L),
          com,
          minDist: distInfo.min,
          maxDist: distInfo.max,
          pairDist: distInfo.pairs,
          warning: s.numericalWarning || null,
          bodyData: { pos: selPos, vel: selVel, speed: vLen(selVel), distNext },
          chaosSep,
          chaosLyap,
          chaosMaxSep: s.chaosMaxSep,
          chaosInitialSep: s.chaosInitialSep,
        });
      }

      // Throttled Chart Tick (~3 Hz)
      chartAccum += frameDt;
      if (chartAccum > 0.3) {
        chartAccum = 0;
        onChartTick?.();
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [entered]);

  return {
    mountRef,
    rendererRef,
    trailBuffersRef,
    trailLinesRef,
  };
}
