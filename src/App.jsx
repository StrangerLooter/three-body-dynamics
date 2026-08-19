import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import {
  PRESETS,
  computeEnergy,
  computeSeparation,
  vAdd,
  integrateStep,
} from './physics/index.js';
import {
  BODY_HEX,
  BODY_NAMES,
  CAMERA_MODES,
  makeEmptyHistory,
} from './constants/index.js';
import {
  callGroqChat,
  getStoredApiKey,
  saveStoredApiKey,
  buildSimSnapshot,
  parseNaturalLanguageCommand,
} from './services/aiService.js';
import { speakText, stopSpeech } from './services/speechService.js';
import { audio } from './services/audioService.js';
import {
  buildExportCSV,
  buildExportJSON,
  downloadTextFile,
  captureCanvasScreenshot,
} from './services/exportService.js';
import { useThreeSimulation } from './hooks/useThreeSimulation.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';

import { TopStatusBar } from './components/panels/TopStatusBar.jsx';
import { TransportBar } from './components/panels/TransportBar.jsx';
import { LeftControlPanel } from './components/panels/LeftControlPanel.jsx';
import { RightTelemetryPanel } from './components/panels/RightTelemetryPanel.jsx';
import { AnalysisDrawer } from './components/analysis/AnalysisDrawer.jsx';
import { ChatPanel } from './components/chat/ChatPanel.jsx';
import { ApiKeyModal } from './components/chat/ApiKeyModal.jsx';
import { WelcomeScreen } from './components/overlay/WelcomeScreen.jsx';
import { ShortcutsModal } from './components/overlay/ShortcutsModal.jsx';
import { WebglErrorModal } from './components/overlay/WebglErrorModal.jsx';
import { WarningNotificationManager } from './components/hud/WarningNotificationManager.jsx';

function makeInitialSimState(presetKey = 'figureEight') {
  const preset = PRESETS[presetKey]();
  return {
    presetKey,
    masses: [...preset.masses],
    radii: [...(preset.radii || [0.16, 0.16, 0.12])],
    state: JSON.parse(JSON.stringify(preset.state)),
    initialState: JSON.parse(JSON.stringify(preset.state)),
    G: 1,
    dt: 0.006,
    integrator: 'rk4',
    speed: 1,
    running: false,
    simTime: 0,
    initialEnergy: null,
    trailsOn: true,
    showVectors: false,
    showCOM: true,
    showGrid: true,
    showAxes: false,
    showLabels: false,
    showSpacetime: false,
    showAtmosphere: true,
    showLagrange: false,
    adaptiveOn: false,
    dtMin: 0.0005,
    dtMax: 0.02,
    tolerance: 1e-6,
    selected: 0,
    chaosOn: false,
    epsilon: 1e-6,
    perturbTarget: 'all',
    perturbType: 'position',
    chaosInitialSep: 0,
    chaosMaxSep: 0,
    chaosT0: 0,
    fieldMode: 'off',
  };
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const rootRef = useRef(null);
  const labelRefs = useRef([]);
  const historyRef = useRef(makeEmptyHistory());
  const sysBRef = useRef(null);
  const simRef = useRef(makeInitialSimState());

  const camStateRef = useRef({
    theta: 0.9,
    phi: 1.15,
    dist: 6.5,
    target: new THREE.Vector3(0, 0, 0),
    desiredTarget: new THREE.Vector3(0, 0, 0),
    mode: 'free',
  });

  // UI Telemetry and Panel State
  const [ui, setUi] = useState({
    running: false,
    integrator: 'rk4',
    speed: 1,
    simTime: 0,
    fps: 0,
    dt: 0.006,
    energy: { KE: 0, PE: 0, total: 0 },
    energyError: 0,
    momentumMag: 0,
    angMomentumMag: 0,
    com: [0, 0, 0],
    minDist: 0,
    maxDist: 0,
    pairDist: { d01: 0, d02: 0, d12: 0 },
    selected: 0,
    masses: [1, 1, 1],
    presetKey: 'figureEight',
    warning: null,
    panelLeft: true,
    panelRight: true,
    camMode: 'free',
    trailsOn: true,
    showVectors: false,
    showCOM: true,
    showGrid: true,
    showAxes: false,
    showLabels: false,
    showSpacetime: false,
    showAtmosphere: true,
    showLagrange: false,
    audioMuted: audio.isMuted,
    adaptiveOn: false,
    dtMin: 0.0005,
    dtMax: 0.02,
    tolerance: 1e-6,
    editMode: 'live',
    bodyData: { pos: [0, 0, 0], vel: [0, 0, 0], speed: 0, distNext: 0 },
    analysisOpen: false,
    analysisTab: 'energy',
    chaosOn: false,
    epsilon: 1e-6,
    perturbTarget: 'all',
    perturbType: 'position',
    chaosInitialSep: 0,
    chaosSep: 0,
    chaosMaxSep: 0,
    chaosLyap: null,
    fieldMode: 'off',
    demoMode: false,
    webglError: false,
    isFullscreen: false,
    helpOpen: false,
    apiKeyModalOpen: false,
  });

  const [editVals, setEditVals] = useState({
    px: '0',
    py: '0',
    pz: '0',
    vx: '0',
    vy: '0',
    vz: '0',
  });
  const [chartTick, setChartTick] = useState(0);

  // Cinematic Red Sci-Fi HUD Warnings State
  const [warnings, setWarnings] = useState([]);
  const warningSlotCounter = useRef(0);

  const handleWarningAlert = useCallback((alertData) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const id = Date.now() + Math.random();
    const slotIndex = warningSlotCounter.current++;

    const newWarning = {
      id,
      level: alertData.level || 'WARNING',
      title: alertData.title || 'CLOSE ENCOUNTER DETECTED',
      bodies: alertData.bodies || 'Body 1 and Body 2',
      description: alertData.description || 'Timestep automatically reduced to maintain stability.',
      timestamp,
      duration: alertData.level === 'CRITICAL' ? 6 : 8,
      slotIndex,
    };

    setWarnings((prev) => {
      // Retain max 3 concurrent warnings
      const next = [...prev, newWarning];
      if (next.length > 3) next.shift();
      return next;
    });
  }, []);

  const handleDismissWarning = useCallback((id) => {
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // AI & Voice Narration State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatMode, setChatMode] = useState('normal');
  const [narrateTimer, setNarrateTimer] = useState(null);
  const narrateRunningRef = useRef(false);
  const [groqKey, setGroqKey] = useState(getStoredApiKey());

  const handleKeySaved = (k) => {
    setGroqKey(k);
    saveStoredApiKey(k);
  };

  // Three Engine Hook
  const { mountRef, rendererRef, trailBuffersRef, trailLinesRef } = useThreeSimulation({
    entered,
    simRef,
    sysBRef,
    historyRef,
    camStateRef,
    labelRefs,
    onSelectBody: (idx) => setUi((p) => ({ ...p, selected: idx })),
    onCamModeChange: (mode) => setUi((p) => ({ ...p, camMode: mode })),
    onTelemetryUpdate: (telemetry) => setUi((p) => ({ ...p, ...telemetry })),
    onChartTick: () => setChartTick((c) => c + 1),
    onWarningAlert: handleWarningAlert,
    onWebglError: () => setUi((p) => ({ ...p, webglError: true })),
  });

  // Coordinate Editor Synchronization
  const loadEditVals = useCallback((idx, mode) => {
    const s = simRef.current;
    if (!s) return;
    const src = mode === 'initial' ? s.initialState : s.state;
    if (src && src.pos && src.pos[idx]) {
      const p = src.pos[idx];
      const v = src.vel[idx];
      setEditVals({
        px: p[0].toFixed(4),
        py: p[1].toFixed(4),
        pz: p[2].toFixed(4),
        vx: v[0].toFixed(4),
        vy: v[1].toFixed(4),
        vz: v[2].toFixed(4),
      });
    }
  }, []);

  useEffect(() => {
    loadEditVals(ui.selected, ui.editMode);
  }, [ui.selected, ui.editMode, loadEditVals]);

  // Simulation Actions
  const clearHistoryArrays = () => {
    const H = historyRef.current;
    if (H) Object.keys(H).forEach((k) => (H[k] = []));
  };

  const togglePlay = useCallback(() => {
    audio.init();
    audio.resume();
    audio.playUiBeep(480, 0.05);
    const s = simRef.current;
    s.running = !s.running;
    setUi((p) => ({ ...p, running: s.running }));
  }, []);

  const resetSim = useCallback(() => {
    audio.playUiBeep(380, 0.08);
    const s = simRef.current;
    s.state = JSON.parse(JSON.stringify(s.initialState));
    s.simTime = 0;
    s.running = false;
    s.initialEnergy = computeEnergy(s.state, s.masses, s.G).total;
    if (trailBuffersRef.current) {
      trailBuffersRef.current.forEach((b) => (b.count = 0));
    }
    if (trailLinesRef.current) {
      trailLinesRef.current.forEach((l) => l?.geometry?.setDrawRange(0, 0));
    }
    clearHistoryArrays();
    setWarnings([]);
    if (s.chaosOn && sysBRef.current) {
      sysBRef.current.state = JSON.parse(JSON.stringify(sysBRef.current.initialState));
      s.chaosMaxSep = s.chaosInitialSep;
      s.chaosT0 = 0;
    }
    setUi((p) => ({
      ...p,
      running: false,
      simTime: 0,
      warning: null,
      chaosSep: s.chaosInitialSep,
      chaosLyap: null,
    }));
  }, [trailBuffersRef, trailLinesRef]);

  const stepOnce = useCallback(() => {
    audio.playUiBeep(560, 0.03);
    const s = simRef.current;
    s.state = integrateStep(s.state, s.masses, s.G, s.dt, s.integrator);
    s.simTime += s.dt;
    if (trailBuffersRef.current) {
      for (let i = 0; i < 3; i++) {
        const buf = trailBuffersRef.current[i];
        if (buf) {
          const idx = (buf.count % 600) * 3;
          buf.pos[idx] = s.state.pos[i][0];
          buf.pos[idx + 1] = s.state.pos[i][1];
          buf.pos[idx + 2] = s.state.pos[i][2];
          buf.count++;
        }
      }
    }
  }, [trailBuffersRef]);

  const setIntegrator = (method) => {
    simRef.current.integrator = method;
    setUi((p) => ({ ...p, integrator: method }));
  };

  const setSpeed = (v) => {
    simRef.current.speed = v;
    setUi((p) => ({ ...p, speed: v }));
  };

  const setMass = (i, v) => {
    simRef.current.masses[i] = v;
    setUi((p) => {
      const masses = [...p.masses];
      masses[i] = v;
      return { ...p, masses };
    });
  };

  const loadPreset = (key) => {
    audio.playUiBeep(620, 0.07);
    const fresh = makeInitialSimState(key);
    simRef.current = fresh;
    sysBRef.current = null;
    if (trailBuffersRef.current) {
      trailBuffersRef.current.forEach((b) => (b.count = 0));
    }
    if (trailLinesRef.current) {
      trailLinesRef.current.forEach((l) => l?.geometry?.setDrawRange(0, 0));
    }
    clearHistoryArrays();
    setWarnings([]);
    camStateRef.current.mode = 'free';
    setUi((p) => ({
      ...p,
      running: false,
      simTime: 0,
      integrator: fresh.integrator,
      speed: fresh.speed,
      masses: [...fresh.masses],
      presetKey: key,
      warning: null,
      camMode: 'free',
      selected: 0,
      chaosOn: false,
      chaosSep: 0,
      chaosLyap: null,
      chaosMaxSep: 0,
      chaosInitialSep: 0,
    }));
  };

  const setCamMode = (mode) => {
    camStateRef.current.mode = mode;
    setUi((p) => ({ ...p, camMode: mode }));
  };

  const cycleCameraMode = () => {
    const idx = CAMERA_MODES.findIndex((m) => m.key === camStateRef.current.mode);
    const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length].key;
    setCamMode(next);
  };

  const resetCamera = () => {
    const cs = camStateRef.current;
    cs.mode = 'free';
    cs.theta = 0.9;
    cs.phi = 1.15;
    cs.dist = 6.5;
    cs.target.set(0, 0, 0);
    setUi((p) => ({ ...p, camMode: 'free' }));
  };

  const toggleFlag = (key) => {
    simRef.current[key] = !simRef.current[key];
    setUi((p) => ({ ...p, [key]: simRef.current[key] }));
  };

  const toggleAudio = () => {
    const isMuted = audio.toggleMute();
    setUi((p) => ({ ...p, audioMuted: isMuted }));
  };

  const setAdaptiveField = (key, value) => {
    simRef.current[key] = value;
    setUi((p) => ({ ...p, [key]: value }));
  };

  const setChaosField = (key, value) => {
    simRef.current[key] = value;
    setUi((p) => ({ ...p, [key]: value }));
  };

  const enableChaosLab = () => {
    audio.playUiBeep(700, 0.08);
    const s = simRef.current;
    const cloneState = JSON.parse(JSON.stringify(s.state));
    const targets = s.perturbTarget === 'all' ? [0, 1, 2] : [Number(s.perturbTarget)];
    targets.forEach((idx) => {
      if (s.perturbType === 'position' || s.perturbType === 'both') {
        cloneState.pos[idx] = vAdd(cloneState.pos[idx], [s.epsilon, 0, 0]);
      }
      if (s.perturbType === 'velocity' || s.perturbType === 'both') {
        cloneState.vel[idx] = vAdd(cloneState.vel[idx], [0, s.epsilon, 0]);
      }
    });
    sysBRef.current = { state: cloneState, initialState: JSON.parse(JSON.stringify(cloneState)) };
    const sep0 = computeSeparation(s.state, cloneState);
    s.chaosOn = true;
    s.chaosInitialSep = sep0;
    s.chaosMaxSep = sep0;
    s.chaosT0 = s.simTime;
    const H = historyRef.current;
    if (H) {
      H.chaosT = [];
      H.sep = [];
    }
    setUi((p) => ({
      ...p,
      chaosOn: true,
      chaosInitialSep: sep0,
      chaosSep: sep0,
      chaosMaxSep: sep0,
      chaosLyap: null,
    }));
  };

  const disableChaosLab = () => {
    simRef.current.chaosOn = false;
    sysBRef.current = null;
    setUi((p) => ({ ...p, chaosOn: false }));
  };

  const setFieldMode = (mode) => {
    simRef.current.fieldMode = mode;
    setUi((p) => ({ ...p, fieldMode: mode }));
  };

  const enableDemoMode = () => {
    loadPreset('figureEight');
    camStateRef.current.mode = 'auto';
    simRef.current.trailsOn = true;
    simRef.current.running = true;
    setUi((p) => ({
      ...p,
      running: true,
      trailsOn: true,
      camMode: 'auto',
      panelLeft: true,
      panelRight: true,
      demoMode: true,
      analysisOpen: false,
    }));
  };

  const exitDemoMode = () => {
    simRef.current.running = false;
    setUi((p) => ({ ...p, running: false, demoMode: false }));
  };

  const applyEditVals = () => {
    const s = simRef.current;
    const idx = ui.selected;
    const p = [
      parseFloat(editVals.px) || 0,
      parseFloat(editVals.py) || 0,
      parseFloat(editVals.pz) || 0,
    ];
    const v = [
      parseFloat(editVals.vx) || 0,
      parseFloat(editVals.vy) || 0,
      parseFloat(editVals.vz) || 0,
    ];
    const target = ui.editMode === 'initial' ? s.initialState : s.state;
    target.pos[idx] = p;
    target.vel[idx] = v;
    if (ui.editMode === 'live') {
      s.initialEnergy = computeEnergy(s.state, s.masses, s.G).total;
    }
  };

  // Fullscreen Handlers
  useEffect(() => {
    const onFsChange = () => setUi((p) => ({ ...p, isFullscreen: !!document.fullscreenElement }));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleTakeScreenshot = () => {
    captureCanvasScreenshot(rendererRef.current);
  };

  const handleExportCSV = () => {
    downloadTextFile(
      buildExportCSV(historyRef.current),
      `three-body-telemetry-${Date.now()}.csv`,
      'text/csv'
    );
  };

  const handleExportJSON = () => {
    downloadTextFile(
      buildExportJSON(historyRef.current),
      `three-body-telemetry-${Date.now()}.json`,
      'application/json'
    );
  };

  // AI & Speech Interaction Handlers
  const sendChatMessage = async (overrideText) => {
    const text = (overrideText || chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg = { role: 'user', content: text };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const nlpReply = parseNaturalLanguageCommand(text, {
        play: () => {
          simRef.current.running = true;
          setUi((p) => ({ ...p, running: true }));
        },
        pause: () => {
          simRef.current.running = false;
          setUi((p) => ({ ...p, running: false }));
        },
        reset: resetSim,
        setSpeed: (spd) => {
          simRef.current.speed = spd;
          setUi((p) => ({ ...p, speed: spd }));
        },
        loadPreset: loadPreset,
        setTrails: (val) => {
          simRef.current.trailsOn = val;
          setUi((p) => ({ ...p, trailsOn: val }));
        },
      });

      const snapshot = buildSimSnapshot(simRef.current, sysBRef.current);
      let reply;

      if (nlpReply) {
        const aiComment = await callGroqChat({
          apiKey: groqKey,
          messages: [...nextMessages, { role: 'assistant', content: nlpReply }],
          mode: 'normal',
          simStateSnapshot: snapshot,
        });
        reply = `${nlpReply}\n\n${aiComment}`;
      } else {
        reply = await callGroqChat({
          apiKey: groqKey,
          messages: nextMessages,
          mode: chatMode,
          simStateSnapshot: snapshot,
        });
      }

      setChatMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatError(err.message || 'AI request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const startNarrate = () => {
    setChatMode('narrate');
    stopSpeech();
    if (narrateTimer) {
      clearInterval(narrateTimer);
      setNarrateTimer(null);
    }

    const runOnce = async () => {
      if (narrateRunningRef.current) return;
      narrateRunningRef.current = true;
      try {
        const snapshot = buildSimSnapshot(simRef.current, sysBRef.current);
        const reply = await callGroqChat({
          apiKey: groqKey,
          messages: [],
          mode: 'narrate',
          simStateSnapshot: snapshot,
        });
        const msg = '🎙 ' + reply;
        setChatMessages((m) => [...m, { role: 'assistant', content: msg }]);
        speakText(reply);
      } catch (e) {
      } finally {
        narrateRunningRef.current = false;
      }
    };

    runOnce();
    const id = setInterval(runOnce, 9000);
    setNarrateTimer(id);
  };

  const stopNarrate = () => {
    if (narrateTimer) {
      clearInterval(narrateTimer);
      setNarrateTimer(null);
    }
    stopSpeech();
    narrateRunningRef.current = false;
    setChatMode('normal');
  };

  const explainNow = async () => {
    if (chatLoading) return;
    await sendChatMessage(
      'Explain what is currently happening in this simulation in 3-4 sentences — the orbital configuration, energy state, and what makes it physically interesting right now.'
    );
  };

  const exportChat = () => {
    if (!chatMessages.length) return;
    const lines = chatMessages
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join('\n\n---\n\n');
    downloadTextFile(
      `THREE-BODY DYNAMICS — AI Physics Conversation\n${'='.repeat(45)}\n\n${lines}`,
      `three-body-ai-chat-${Date.now()}.txt`,
      'text/plain'
    );
  };

  useEffect(() => {
    return () => {
      if (narrateTimer) clearInterval(narrateTimer);
      stopSpeech();
    };
  }, [narrateTimer]);

  // Keyboard Hotkeys
  useKeyboardShortcuts({
    enabled: entered,
    onTogglePlay: togglePlay,
    onReset: resetSim,
    onToggleTrails: () => toggleFlag('trailsOn'),
    onToggleVectors: () => toggleFlag('showVectors'),
    onToggleLagrange: () => toggleFlag('showLagrange'),
    onToggleAudio: toggleAudio,
    onCycleCamera: cycleCameraMode,
    onFocusSelected: () => {
      camStateRef.current.mode = 'body' + simRef.current.selected;
      setUi((p) => ({ ...p, camMode: 'body' + simRef.current.selected }));
    },
    onToggleAnalysis: () => setUi((p) => ({ ...p, analysisOpen: !p.analysisOpen })),
    onToggleHelp: () => setUi((p) => ({ ...p, helpOpen: !p.helpOpen })),
    onCloseModals: () =>
      setUi((p) => ({ ...p, analysisOpen: false, helpOpen: false, apiKeyModalOpen: false })),
  });

  if (ui.webglError) {
    return <WebglErrorModal />;
  }

  if (!entered) {
    return (
      <WelcomeScreen
        onEnter={() => {
          audio.init();
          audio.resume();
          setEntered(true);
        }}
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className="w-full h-full min-h-[600px] bg-[#02040a] relative overflow-hidden select-none font-mono"
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Atmospheric Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Dynamic 3D Projected Body Labels */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          ref={(el) => (labelRefs.current[i] = el)}
          className="absolute top-0 left-0 pointer-events-none text-[9px] tracking-widest px-1 py-0.5 -translate-x-1/2 -translate-y-[130%] hidden z-10 font-bold"
          style={{ color: BODY_HEX[i], textShadow: '0 0 8px rgba(0,0,0,0.95)' }}
        >
          {BODY_NAMES[i]}
        </div>
      ))}

      {/* Floating Cinematic Red Sci-Fi HUD Warning Cards */}
      <WarningNotificationManager warnings={warnings} onDismiss={handleDismissWarning} />

      {/* Top Status Bar */}
      <TopStatusBar
        simTime={ui.simTime}
        running={ui.running}
        fps={ui.fps}
        dt={ui.dt}
        integrator={ui.integrator}
        camMode={ui.camMode}
        demoMode={ui.demoMode}
        showLagrange={ui.showLagrange}
        audioMuted={ui.audioMuted}
        isFullscreen={ui.isFullscreen}
        chatOpen={chatOpen}
        onToggleDemoMode={ui.demoMode ? exitDemoMode : enableDemoMode}
        onToggleAudio={toggleAudio}
        onTakeScreenshot={handleTakeScreenshot}
        onToggleFullscreen={toggleFullscreen}
        onToggleHelp={() => setUi((p) => ({ ...p, helpOpen: !p.helpOpen }))}
        onToggleChat={() => setChatOpen((v) => !v)}
        onOpenApiKeyModal={() => setUi((p) => ({ ...p, apiKeyModalOpen: true }))}
      />

      {/* Numerical Warning Alert */}
      {ui.warning && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 border border-amber-400/50 bg-amber-950/70 text-amber-300 text-xs tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.2)]">
          ⚠ {ui.warning}
        </div>
      )}

      {/* Left Control Panel */}
      <LeftControlPanel
        open={ui.panelLeft}
        running={ui.running}
        speed={ui.speed}
        integrator={ui.integrator}
        G={simRef.current.G}
        adaptiveOn={ui.adaptiveOn}
        dtMin={ui.dtMin}
        dtMax={ui.dtMax}
        tolerance={ui.tolerance}
        camMode={ui.camMode}
        trailsOn={ui.trailsOn}
        showVectors={ui.showVectors}
        showCOM={ui.showCOM}
        showGrid={ui.showGrid}
        showAxes={ui.showAxes}
        showLabels={ui.showLabels}
        showSpacetime={ui.showSpacetime}
        showAtmosphere={ui.showAtmosphere}
        showLagrange={ui.showLagrange}
        audioMuted={ui.audioMuted}
        fieldMode={ui.fieldMode}
        presetKey={ui.presetKey}
        chaosOn={ui.chaosOn}
        epsilon={ui.epsilon}
        perturbTarget={ui.perturbTarget}
        perturbType={ui.perturbType}
        chaosInitialSep={ui.chaosInitialSep}
        chaosSep={ui.chaosSep}
        chaosMaxSep={ui.chaosMaxSep}
        chaosLyap={ui.chaosLyap}
        masses={ui.masses}
        onTogglePlay={togglePlay}
        onReset={resetSim}
        onStepOnce={stepOnce}
        onSetSpeed={setSpeed}
        onSetIntegrator={setIntegrator}
        onToggleAdaptive={() => toggleFlag('adaptiveOn')}
        onSetAdaptiveParam={setAdaptiveField}
        onSetCamMode={setCamMode}
        onResetCamera={resetCamera}
        onToggleVisualFlag={toggleFlag}
        onToggleAudio={toggleAudio}
        onSetFieldMode={setFieldMode}
        onLoadPreset={loadPreset}
        onSetChaosParam={setChaosField}
        onEnableChaos={enableChaosLab}
        onDisableChaos={disableChaosLab}
        onSetMass={setMass}
      />

      {/* Right Telemetry Panel */}
      <RightTelemetryPanel
        open={ui.panelRight}
        energy={ui.energy}
        energyError={ui.energyError}
        momentumMag={ui.momentumMag}
        angMomentumMag={ui.angMomentumMag}
        minDist={ui.minDist}
        maxDist={ui.maxDist}
        com={ui.com}
        pairDist={ui.pairDist}
        selected={ui.selected}
        masses={ui.masses}
        bodyData={ui.bodyData}
        editMode={ui.editMode}
        editVals={editVals}
        onSelectBody={(idx) => {
          simRef.current.selected = idx;
          setUi((p) => ({ ...p, selected: idx }));
        }}
        onSetEditMode={(mode) => setUi((p) => ({ ...p, editMode: mode }))}
        onEditValChange={(field, val) => setEditVals((p) => ({ ...p, [field]: val }))}
        onApplyEditVals={applyEditVals}
        onRevertEditVals={() => loadEditVals(ui.selected, ui.editMode)}
      />

      {/* Panel Collapse / Expand Flaps */}
      <button
        onClick={() => setUi((p) => ({ ...p, panelLeft: !p.panelLeft }))}
        aria-label={ui.panelLeft ? 'Collapse control panel' : 'Expand control panel'}
        className="absolute top-1/2 left-0 z-30 -translate-y-1/2 bg-black/60 border border-white/10 text-slate-400 text-xs px-1 py-3.5 hover:text-cyan-300 hover:bg-black/80 transition-colors"
      >
        {ui.panelLeft ? '‹' : '›'}
      </button>

      <button
        onClick={() => setUi((p) => ({ ...p, panelRight: !p.panelRight }))}
        aria-label={ui.panelRight ? 'Collapse telemetry panel' : 'Expand telemetry panel'}
        className="absolute top-1/2 right-0 z-30 -translate-y-1/2 bg-black/60 border border-white/10 text-slate-400 text-xs px-1 py-3.5 hover:text-cyan-300 hover:bg-black/80 transition-colors"
      >
        {ui.panelRight ? '›' : '‹'}
      </button>

      {/* Analysis Drawer */}
      <AnalysisDrawer
        open={ui.analysisOpen}
        tab={ui.analysisTab}
        onTab={(tab) => setUi((p) => ({ ...p, analysisTab: tab }))}
        history={historyRef.current}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onClose={() => setUi((p) => ({ ...p, analysisOpen: false }))}
      />

      {/* Bottom Playback Transport Bar */}
      <TransportBar
        running={ui.running}
        simTime={ui.simTime}
        speed={ui.speed}
        analysisOpen={ui.analysisOpen}
        onTogglePlay={togglePlay}
        onReset={resetSim}
        onStepOnce={stepOnce}
        onToggleAnalysis={() => setUi((p) => ({ ...p, analysisOpen: !p.analysisOpen }))}
      />

      {/* AI Physics Chat Panel */}
      {chatOpen && (
        <ChatPanel
          onClose={() => {
            setChatOpen(false);
            stopNarrate();
          }}
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          onSend={sendChatMessage}
          loading={chatLoading}
          error={chatError}
          chatMode={chatMode}
          onSetMode={setChatMode}
          onExplain={explainNow}
          onStartNarrate={startNarrate}
          onStopNarrate={stopNarrate}
          narrateActive={!!narrateTimer}
          onQuiz={() =>
            sendChatMessage(
              'Ask me a multiple choice physics quiz question based on what the simulation is doing right now.'
            )
          }
          onJudge={() =>
            sendChatMessage(
              'You are a competition judge. Ask me one tough question about this simulation to test my understanding.'
            )
          }
          onExportChat={exportChat}
          onOpenApiKeyModal={() => setUi((p) => ({ ...p, apiKeyModalOpen: true }))}
        />
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {ui.helpOpen && (
        <ShortcutsModal onClose={() => setUi((p) => ({ ...p, helpOpen: false }))} />
      )}

      {/* Groq API Key Configuration Modal */}
      <ApiKeyModal
        isOpen={ui.apiKeyModalOpen}
        onClose={() => setUi((p) => ({ ...p, apiKeyModalOpen: false }))}
        onKeySaved={handleKeySaved}
      />
    </div>
  );
}
