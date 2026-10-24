import {
  computeEnergy,
  computeMomentum,
  computeAngularMomentum,
  computeCOM,
  computePairDistances,
  computeSeparation,
  vLen,
  vSub,
  vDot,
} from '../physics/index.js';

export const GROQ_STORAGE_KEY = 'groq_api_key';

export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Default)', description: 'Balanced reasoning & physics capability' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', description: 'Ultra-fast inference & high accuracy' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'High context window' },
];

export function getStoredApiKey() {
  const envKey = (import.meta.env.VITE_GROQ_API_KEY || '').trim();
  if (envKey) return envKey;
  try {
    const fromStorage = window.localStorage.getItem(GROQ_STORAGE_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch (e) {}
  return '';
}

export function saveStoredApiKey(key) {
  try {
    if (key && key.trim()) {
      window.localStorage.setItem(GROQ_STORAGE_KEY, key.trim());
    } else {
      window.localStorage.removeItem(GROQ_STORAGE_KEY);
    }
  } catch (e) {}
}

export function stripThinkTags(text) {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s+/, '')
    .trim();
}

/**
 * Enhanced scientific simulation telemetry snapshot:
 * Captures positions, velocities, speeds, conservation laws, energy drift,
 * deterministic kinematic convergence (approaching vs receding),
 * escape condition checks, and Chaos Lab divergence metrics.
 */
export function buildSimSnapshot(sim, sysB = null) {
  if (!sim || !sim.state || !sim.state.pos) return '';

  const energy = computeEnergy(sim.state, sim.masses, sim.G);
  const p = computeMomentum(sim.state, sim.masses);
  const L = computeAngularMomentum(sim.state, sim.masses);
  const com = computeCOM(sim.state, sim.masses);
  const dist = computePairDistances(sim.state);

  // Body speeds and states
  const bodyDetails = [0, 1, 2].map((i) => {
    const pos = sim.state.pos[i] || [0, 0, 0];
    const vel = sim.state.vel[i] || [0, 0, 0];
    const speed = vLen(vel);
    const mass = sim.masses[i];

    // Specific orbital energy estimation relative to the other two bodies:
    // E_spec = 0.5 * v^2 - sum(G * m_j / r_ij)
    let potentialSum = 0;
    for (let j = 0; j < 3; j++) {
      if (j !== i) {
        const r_ij = vLen(vSub(sim.state.pos[j], pos));
        potentialSum += (sim.G * sim.masses[j]) / Math.max(r_ij, 1e-4);
      }
    }
    const specificEnergy = 0.5 * speed * speed - potentialSum;
    const boundStatus = specificEnergy > 0 ? 'HYPERBOLIC/UNBOUND (Potential Escape)' : 'BOUND';

    return `Body ${i + 1} (m=${mass.toFixed(3)}): pos=(${pos.map((v) => v.toFixed(3)).join(', ')}) | vel=(${vel.map((v) => v.toFixed(3)).join(', ')}) | speed=${speed.toFixed(3)} | status=${boundStatus}`;
  });

  // Deterministic pairwise kinematic rate of change (dr_ij/dt = (r_ij . v_ij) / |r_ij|)
  const computeClosingRate = (i, j) => {
    const r_ij = vSub(sim.state.pos[j], sim.state.pos[i]);
    const v_ij = vSub(sim.state.vel[j], sim.state.vel[i]);
    const d = vLen(r_ij);
    if (d < 1e-5) return { d: 0, rate: 0, trend: 'COLLISION/CLOSE ENCOUNTER' };
    const rate = vDot(r_ij, v_ij) / d;
    const trend = rate < -0.05 ? 'APPROACHING' : rate > 0.05 ? 'RECEDING' : 'TURNING/STEADY';
    return { d, rate, trend };
  };

  const p01 = computeClosingRate(0, 1);
  const p02 = computeClosingRate(0, 2);
  const p12 = computeClosingRate(1, 2);

  // Energy drift analysis
  let energyDriftStr = 'Initial energy baseline not recorded';
  if (typeof sim.initialEnergy === 'number' && !isNaN(sim.initialEnergy)) {
    const deltaE = energy.total - sim.initialEnergy;
    const absE0 = Math.abs(sim.initialEnergy) || 1e-6;
    const driftFrac = (Math.abs(deltaE) / absE0) * 100;
    energyDriftStr = `drift ΔE=${deltaE.toExponential(3)} (${driftFrac.toFixed(4)}% vs initial E0=${sim.initialEnergy.toFixed(4)})`;
  }

  // Chaos lab telemetry
  let chaosSection = `Chaos Lab: ${sim.chaosOn ? 'ACTIVE' : 'INACTIVE'}`;
  if (sim.chaosOn && sysB && sysB.state) {
    const currentSep = computeSeparation(sim.state, sysB.state);
    const initialSep = sim.chaosInitialSep || 1e-6;
    const elapsed = Math.max(0, sim.simTime - (sim.chaosT0 || 0));
    let lyapStr = 'insufficient elapsed time (t < 0.1s)';
    if (elapsed > 0.1 && initialSep > 0 && currentSep > 0) {
      const lambda = Math.log(currentSep / initialSep) / elapsed;
      lyapStr = `λ_approx ≈ ${lambda.toFixed(4)} s⁻¹`;
    }
    chaosSection += ` | Phase-space separation Δ(t)=${currentSep.toExponential(3)} (initial=${initialSep.toExponential(3)}) | ${lyapStr}`;
  }

  const lines = [
    `=== SIMULATION TELEMETRY (SNAPSHOT at t=${sim.simTime.toFixed(3)}s) ===`,
    `Preset: ${sim.presetKey} | Integrator: ${sim.integrator.toUpperCase()} | Timestep dt=${sim.dt.toExponential(2)} | G=${sim.G} | Status: ${sim.running ? 'RUNNING' : 'PAUSED'}`,
    `Total Energy: E=${energy.total.toFixed(5)} (Kinetic=${energy.KE.toFixed(5)}, Potential=${energy.PE.toFixed(5)}) | ${energyDriftStr}`,
    `Linear Momentum |P|=${vLen(p).toFixed(5)} | Angular Momentum |L|=${vLen(L).toFixed(5)} | Center of Mass=(${com.map((v) => v.toFixed(3)).join(', ')})`,
    `Pairwise Distances & Trends:`,
    `  • Body 1 - Body 2: d=${p01.d.toFixed(3)} (${p01.trend}, rate=${p01.rate.toFixed(3)} u/s)`,
    `  • Body 1 - Body 3: d=${p02.d.toFixed(3)} (${p02.trend}, rate=${p02.rate.toFixed(3)} u/s)`,
    `  • Body 2 - Body 3: d=${p12.d.toFixed(3)} (${p12.trend}, rate=${p12.rate.toFixed(3)} u/s)`,
    `  • Minimum Pair Distance: ${dist.min.toFixed(4)} ${dist.min < 0.35 ? '[CLOSE ENCOUNTER DETECTED]' : ''}`,
    `Body Kinematics:`,
    ...bodyDetails.map((b) => `  ${b}`),
    chaosSection,
  ];

  return lines.join('\n');
}

export const TEAM_LINE =
  'Project team: Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya. If asked who built/developed this or who the team is, answer exactly: Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya. Do not invent roles or additional members.';

const FORMAT_RULES =
  'Response rules: Be concise, clear, and scientifically exact. Use markdown, clear headings/bullet points where appropriate. Use standard plain-text / markdown math notation (e.g. ^, sqrt(), *, or LaTeX $...$ / $$...$$). Do NOT output <think> tags, internal reasoning, or chain-of-thought — only provide the polished final response. Target audience: physics students, researchers, and scientific simulation users.';

export const SYSTEM_PROMPTS = {
  normal:
    `You are PHYSICS COPILOT, a premier scientific AI workstation assistant embedded directly inside an interactive 3D Three-Body Gravitational Dynamics simulation. ` +
    `Your purpose is to assist users with orbital mechanics, Newtonian gravitation, conservation laws, numerical integration methods (RK4, Velocity Verlet, Euler), and chaos dynamics. ` +
    `Always use and cite the live simulation telemetry whenever relevant. Distinguish clearly between directly observed state values and theoretical predictions. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  quick:
    `You are PHYSICS COPILOT in QUICK ANSWER mode. ` +
    `Provide an immediate, direct, concise, scientifically accurate answer in 1-3 sentences maximum. ` +
    `Cite current simulation values if relevant. Avoid lengthy introductory or concluding pleasantries. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  learn:
    `You are PHYSICS COPILOT in LEARN (Physics Tutor) mode. ` +
    `Explain concepts with intuition, physical analogies, and conceptual clarity tailored for a college physics student. ` +
    `Break down complex gravitational mechanics into digestible principles: why orbits precess, how energy transfers between kinetic and potential, what causes unstable close encounters, and how conservation laws dictate motion. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  math:
    `You are PHYSICS COPILOT in MATHEMATICAL DERIVATION mode. ` +
    `Focus on equations, derivations, conservation proofs, vector calculus, Hamiltonian mechanics (H = T + V), and differential equations of motion. ` +
    `Provide exact formulas: gravitational force F_i = -G sum (m_i m_j / r_ij^3) r_ij, angular momentum L = sum r_i x p_i, and Taylor expansions for integration error terms. ` +
    `Use clear mathematical notation and state all physical units and assumptions. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  research:
    `You are PHYSICS COPILOT in RESEARCH & DYNAMICAL SYSTEMS mode. ` +
    `Provide deep, rigorous scientific analysis. Evaluate the orbital configuration from a dynamical systems perspective: ` +
    `assess phase-space trajectories, Poincaré recurrence, resonance, sensitivity to initial conditions, and numerical artifacts vs true physical dynamics. ` +
    `Carefully separate observed data from extrapolation. Note numerical dissipation, timestep truncation error, and integrator drift. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  code:
    `You are PHYSICS COPILOT in COMPUTATIONAL PHYSICS & NUMERICAL METHODS mode. ` +
    `Explain the underlying numerical integration schemes: Fourth-order Runge-Kutta (RK4), Velocity Verlet (symplectic kick-drift-kick), Forward Euler, adaptive timestepping, and energy drift phenomena. ` +
    `Provide concise, clean pseudocode or code snippets where helpful. Explain order of convergence (O(dt^4) vs O(dt^2)) and phase-space volume conservation (Liouville's theorem). ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  quiz:
    `You are PHYSICS COPILOT in QUIZ mode. ` +
    `Ask ONE multiple-choice question (with options A, B, C, D) directly related to what is happening in the current orbital simulation right now. ` +
    `Format: Question on first line, followed by A), B), C), D) on separate lines. ` +
    `Keep it educational, challenging, and concise. Do NOT reveal the correct answer until the user responds. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  judge:
    `You are PHYSICS COPILOT acting as a Physics Professor and Competition Judge evaluating a student's Three-Body Simulator at an academic symposium. ` +
    `Ask ONE rigorous, probing question testing the user's understanding of the simulation's validity, numerical integrator choices, conservation laws, or chaos boundaries. ` +
    `Reference specific current telemetry values to ground your critique. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  narrate:
    `You are a live science documentary narrator for a 3D Three-Body Problem simulation. ` +
    `In exactly 2-3 sentences, describe what is CURRENTLY happening in the gravitational dance — like a dramatic, elegant science documentary voiceover. ` +
    `Cite at least one specific physical value (energy, distance, or speed) from the live telemetry. Be vivid, cinematic, and scientifically accurate. ` +
    `Do NOT output <think> tags or bullet points. Output only the pure narration text. ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  experiment:
    `You are PHYSICS COPILOT in EXPERIMENT PLANNER mode. ` +
    `Structure your response as a scientific experiment protocol: ` +
    `1. Hypothesis: What physical or numerical phenomenon are we testing? ` +
    `2. Independent Variable: Parameter to vary (e.g. mass m_1, timestep dt, integrator, initial perturbation epsilon). ` +
    `3. Dependent Variables & Telemetry to Measure: Energy drift ΔE, Lyapunov exponent, orbital period, minimum distance. ` +
    `4. Controlled Conditions: Fixed initial coordinates, total simulation duration, G. ` +
    `5. Expected Physical Interpretation: Predicted outcome based on analytical mechanics. ` +
    `Keep the protocol actionable and bounded. ${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,

  report:
    `You are PHYSICS COPILOT in REPORT-READY SCIENTIFIC SUMMARY mode. ` +
    `Format your response as a publication-ready scientific brief: ` +
    `### 1. Objective & System Configuration ` +
    `### 2. Live Telemetry & Kinematics ` +
    `### 3. Conservation Laws & Stability Assessment ` +
    `### 4. Dynamical Interpretation (Resonance, Chaos, or Hierarchy) ` +
    `### 5. Numerical Uncertainty & Integrator Trade-offs ` +
    `### 6. Recommended Next Investigation ` +
    `Provide concise, professional data citations based directly on the live telemetry. ${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,
};

export async function callGroqChat({
  apiKey,
  messages,
  mode = 'normal',
  simStateSnapshot = '',
  model = 'openai/gpt-oss-120b',
  signal = null,
}) {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) {
    throw new Error('Groq API Key is missing. Please click ⚙ in the header to enter your free Groq API key.');
  }

  const basePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.normal;
  const systemContent = basePrompt + simStateSnapshot;

  const isBrief = mode === 'narrate' || mode === 'quick';
  const temperature = mode === 'narrate' ? 0.6 : 0.25;
  const max_tokens = isBrief ? 180 : 850;

  // Sliding window: send system prompt + up to last 10 messages
  const body = {
    model,
    messages: [{ role: 'system', content: systemContent }, ...messages.slice(-10)],
    temperature,
    max_tokens,
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${effectiveKey.trim()}`,
    },
    body: JSON.stringify(body),
    signal: signal || undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    let userMsg = `Groq API Error (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) {
        userMsg += `: ${parsed.error.message}`;
      }
    } catch (e) {
      userMsg += `: ${errText.slice(0, 180)}`;
    }
    throw new Error(userMsg);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '(No response received)';
  return stripThinkTags(raw);
}

/**
 * Natural language command parser and schema validator.
 * Safely parses user commands, validates permitted parameters against simulation constraints,
 * and calls handlers only when confirmed. Returns informative confirmation text or null if not a command.
 */
export function parseNaturalLanguageCommand(text, actions = {}) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Play / Start / Resume / Unpause
  if (/^(play|start|resume|unpause)\b/i.test(lower) || lower === 'run') {
    if (actions.play) {
      actions.play();
      return '▶ Action Executed: Simulation running.';
    }
    return '⚠ Unable to start simulation: play action handler unavailable.';
  }

  // Pause / Stop / Freeze
  if (/^(pause|stop|freeze|halt)\b/i.test(lower)) {
    if (actions.pause) {
      actions.pause();
      return '⏸ Action Executed: Simulation paused.';
    }
    return '⚠ Unable to pause simulation: pause action handler unavailable.';
  }

  // Reset / Restart
  if (/^(reset|restart|revert)\b/i.test(lower) || lower.includes('reset to initial')) {
    if (actions.reset) {
      actions.reset();
      return '⟲ Action Executed: Simulation reset to initial conditions.';
    }
    return '⚠ Unable to reset simulation: reset action handler unavailable.';
  }

  // Step once
  if (/^(step|step forward|advance one step)\b/i.test(lower)) {
    if (actions.step) {
      actions.step();
      return '⏭ Action Executed: Stepped forward by 1 timestep.';
    }
  }

  // Simulation speed: speed [0.1 .. 100]
  const speedMatch = lower.match(/(?:set\s+)?speed\s*(?:to\s*)?([0-9]*\.?[0-9]+)x?/i);
  if (speedMatch) {
    const spd = parseFloat(speedMatch[1]);
    const validSpeeds = [0.1, 0.25, 0.5, 1, 2, 5, 10, 100];
    if (validSpeeds.includes(spd)) {
      if (actions.setSpeed) {
        actions.setSpeed(spd);
        return `⚡ Action Executed: Simulation speed set to ${spd}×.`;
      }
    } else {
      return `⚠ Invalid speed ${spd}×. Supported speed multipliers: ${validSpeeds.join(', ')}×.`;
    }
  }

  // Preset switching
  if (lower.includes('figure') || lower.includes('figure-8') || lower.includes('figure8')) {
    if (actions.loadPreset) {
      actions.loadPreset('figureEight');
      return '🌀 Action Executed: Loaded Figure-8 periodic choreography.';
    }
  }
  if (lower.includes('solar') || lower.includes('planetary') || lower.includes('kepler')) {
    if (actions.loadPreset) {
      actions.loadPreset('solarSystem');
      return '🪐 Action Executed: Loaded Solar Planetary System.';
    }
  }
  if (lower.includes('hierarchical') || lower.includes('triple')) {
    if (actions.loadPreset) {
      actions.loadPreset('hierarchical');
      return '⭐ Action Executed: Loaded Hierarchical Triple System.';
    }
  }
  if ((lower.includes('chaos') || lower.includes('unstable')) && (lower.includes('preset') || lower.includes('load') || lower.includes('switch'))) {
    if (actions.loadPreset) {
      actions.loadPreset('chaos');
      return '💥 Action Executed: Loaded Equal-Mass Chaotic Configuration.';
    }
  }
  if (lower.includes('restricted') || lower.includes('three body') && lower.includes('preset')) {
    if (actions.loadPreset) {
      actions.loadPreset('restricted');
      return '🔬 Action Executed: Loaded Restricted Three-Body Regime.';
    }
  }

  // Integrator switching
  if (
    lower.includes('integrator') ||
    lower.startsWith('switch to') ||
    lower.startsWith('use ') ||
    lower.startsWith('set integrator') ||
    ['rk4', 'verlet', 'euler'].includes(lower)
  ) {
    if (lower.includes('verlet')) {
      if (actions.setIntegrator) {
        actions.setIntegrator('verlet');
        return '⚙ Action Executed: Integrator changed to Velocity Verlet (Symplectic O(dt²)).';
      }
    } else if (lower.includes('euler')) {
      if (actions.setIntegrator) {
        actions.setIntegrator('euler');
        return '⚙ Action Executed: Integrator changed to Euler (First Order O(dt)).';
      }
    } else if (lower.includes('rk4') || lower.includes('runge')) {
      if (actions.setIntegrator) {
        actions.setIntegrator('rk4');
        return '⚙ Action Executed: Integrator changed to Runge-Kutta 4th Order (O(dt⁴)).';
      }
    }
  }

  // Trails toggle
  if (lower.match(/\btrails?\s+(?:on|enable|show|activate)\b/i) || lower === 'enable trails') {
    if (actions.setTrails) {
      actions.setTrails(true);
      return '✓ Action Executed: Orbital trails enabled.';
    }
  }
  if (lower.match(/\btrails?\s+(?:off|disable|hide|deactivate)\b/i) || lower === 'disable trails') {
    if (actions.setTrails) {
      actions.setTrails(false);
      return '✓ Action Executed: Orbital trails disabled.';
    }
  }

  // Chaos Lab toggle
  if (lower.match(/chaos\s*(?:lab)?\s*(?:on|enable|start|activate)\b/i)) {
    if (actions.enableChaos) {
      actions.enableChaos();
      return '💥 Action Executed: Chaos Lab activated (Twin Perturbed System initialized).';
    }
  }
  if (lower.match(/chaos\s*(?:lab)?\s*(?:off|disable|stop|deactivate)\b/i)) {
    if (actions.disableChaos) {
      actions.disableChaos();
      return '✓ Action Executed: Chaos Lab deactivated.';
    }
  }

  // Velocity vectors toggle
  if (lower.match(/vectors?\s*(?:on|enable|show)\b/i)) {
    if (actions.setVectors) {
      actions.setVectors(true);
      return '✓ Action Executed: Velocity vectors enabled.';
    }
  }
  if (lower.match(/vectors?\s*(?:off|disable|hide)\b/i)) {
    if (actions.setVectors) {
      actions.setVectors(false);
      return '✓ Action Executed: Velocity vectors disabled.';
    }
  }

  // Lagrange points toggle
  if (lower.match(/lagrange\s*(?:points?)?\s*(?:on|enable|show)\b/i)) {
    if (actions.setLagrange) {
      actions.setLagrange(true);
      return '✓ Action Executed: Lagrange points (L₁-L₅) visualization enabled.';
    }
  }
  if (lower.match(/lagrange\s*(?:points?)?\s*(?:off|disable|hide)\b/i)) {
    if (actions.setLagrange) {
      actions.setLagrange(false);
      return '✓ Action Executed: Lagrange points visualization disabled.';
    }
  }

  // Mass adjustment command: e.g. "set mass of body 1 to 3.5" or "body 2 mass 0.5"
  const massMatch = lower.match(/(?:set\s+)?(?:mass\s+of\s+)?body\s*([123])\s*(?:mass\s*)?(?:to\s*)?([0-9]*\.?[0-9]+)/i);
  if (massMatch) {
    const bodyIdx = parseInt(massMatch[1], 10) - 1;
    const val = parseFloat(massMatch[2]);
    if (isNaN(val) || val < 0.001 || val > 100) {
      return `⚠ Mass out of bounds. Permitted range: 0.001 to 100.0 (received ${val}).`;
    }
    if (actions.setMass) {
      actions.setMass(bodyIdx, val);
      return `⚖ Action Executed: Mass of Body ${bodyIdx + 1} set to ${val}.`;
    }
  }

  // Audio / Sound toggle
  if (lower.match(/\b(mute|sound off|audio off)\b/i)) {
    if (actions.setAudio) {
      actions.setAudio(true);
      return '🔇 Action Executed: Audio muted.';
    }
  }
  if (lower.match(/\b(unmute|sound on|audio on)\b/i)) {
    if (actions.setAudio) {
      actions.setAudio(false);
      return '🔊 Action Executed: Audio unmuted.';
    }
  }

  // If user typed a command keyword but it was invalid / unrecognized
  const isCommandAttempt = /^(set|load|switch|change|toggle|turn|adjust)\b/i.test(lower);
  if (isCommandAttempt) {
    return (
      `⚠ Unrecognized or ambiguous command: "${text}".\n\n` +
      `Supported simulation commands:\n` +
      `• Play/Pause: "pause", "resume", "play"\n` +
      `• Reset/Step: "reset", "step"\n` +
      `• Speed: "speed 0.5", "speed 1", "speed 2"\n` +
      `• Presets: "preset figure-8", "preset solar", "preset hierarchical", "preset chaos", "preset restricted"\n` +
      `• Integrator: "integrator rk4", "integrator verlet", "integrator euler"\n` +
      `• Visualizations: "trails on/off", "vectors on/off", "lagrange on/off"\n` +
      `• Chaos: "chaos on", "chaos off"\n` +
      `• Mass: "set mass of body 1 to 2.5"`
    );
  }

  return null;
}
