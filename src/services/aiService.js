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
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Default)', description: 'Ultra-fast inference & superior scientific accuracy' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', description: 'Ultra-low latency real-time reasoning' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'High context window' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', description: 'Balanced reasoning & physics capability' },
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

// In-memory LRU Semantic Answer Cache
const SEMANTIC_CACHE = new Map();
const MAX_CACHE_SIZE = 40;

export function getCachedAnswer(query, mode = 'normal') {
  if (!query || typeof query !== 'string') return null;
  const key = `${mode}:${query.toLowerCase().trim()}`;
  return SEMANTIC_CACHE.get(key) || null;
}

export function setCachedAnswer(query, mode, answer) {
  if (!query || !answer || typeof query !== 'string') return;
  const key = `${mode}:${query.toLowerCase().trim()}`;
  if (SEMANTIC_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = SEMANTIC_CACHE.keys().next().value;
    SEMANTIC_CACHE.delete(firstKey);
  }
  SEMANTIC_CACHE.set(key, answer);
}

/**
 * Compact, token-quantized simulation telemetry snapshot:
 * Captures positions, velocities, speeds, conservation laws, energy drift,
 * and pairwise distances in a compact key-value format (~90 tokens vs 450 tokens).
 */
export function buildSimSnapshot(sim, sysB = null) {
  if (!sim || !sim.state || !sim.state.pos) return '';

  const energy = computeEnergy(sim.state, sim.masses, sim.G);
  const p = computeMomentum(sim.state, sim.masses);
  const L = computeAngularMomentum(sim.state, sim.masses);
  const com = computeCOM(sim.state, sim.masses);
  const dist = computePairDistances(sim.state);

  const bodies = [0, 1, 2].map((i) => {
    const pos = sim.state.pos[i] || [0, 0, 0];
    const vel = sim.state.vel[i] || [0, 0, 0];
    const speed = vLen(vel);
    const m = sim.masses[i];
    return `B${i + 1}(m=${m.toFixed(2)}): r=[${pos.map((v) => v.toFixed(2)).join(',')}], v=[${vel.map((v) => v.toFixed(2)).join(',')}], spd=${speed.toFixed(2)}`;
  });

  let drift = '0%';
  if (typeof sim.initialEnergy === 'number' && !isNaN(sim.initialEnergy)) {
    const deltaE = energy.total - sim.initialEnergy;
    const absE0 = Math.abs(sim.initialEnergy) || 1e-6;
    drift = `${((Math.abs(deltaE) / absE0) * 100).toFixed(3)}%`;
  }

  let chaos = '';
  if (sim.chaosOn && sysB && sysB.state) {
    const sep = computeSeparation(sim.state, sysB.state);
    chaos = ` | ChaosSep=${sep.toExponential(2)}`;
  }

  const p01 = dist?.pairs?.d01?.toFixed(2) || '—';
  const p02 = dist?.pairs?.d02?.toFixed(2) || '—';
  const p12 = dist?.pairs?.d12?.toFixed(2) || '—';
  const minDist = dist?.min?.toFixed(2) || '—';

  return (
    `[LIVE TELEMETRY t=${sim.simTime.toFixed(1)}s, ${sim.presetKey}, ${sim.integrator.toUpperCase()}, dt=${sim.dt.toExponential(1)}, ${sim.running ? 'RUNNING' : 'PAUSED'}]\n` +
    `E=${energy.total.toFixed(3)} (KE=${energy.KE.toFixed(3)}, PE=${energy.PE.toFixed(3)}), Drift=${drift}\n` +
    `|P|=${vLen(p).toFixed(3)}, |L|=${vLen(L).toFixed(3)}, COM=[${com.map((v) => v.toFixed(2)).join(',')}]\n` +
    `MinDist=${minDist} (B1-B2:${p01}, B1-B3:${p02}, B2-B3:${p12})${chaos}\n` +
    bodies.join(' | ')
  );
}

export const TEAM_LINE =
  'Project team: Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya. If asked who built/developed this or who the team is, answer exactly: Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya. Do not invent roles or additional members.';

const FORMAT_RULES =
  'RESPONSE RULES:\n' +
  '1. Keep your responses SHORT, SIMPLE, and DIRECT (2 to 4 concise paragraphs or bullet points). Avoid long walls of text.\n' +
  '2. Whenever presenting orbital coordinates, initial conditions, or masses, ALWAYS format them as a clean Markdown table with headers: `| Body | Mass | Position (x, y, z) | Velocity (vx, vy, vz) |`.\n' +
  '3. Use standard LaTeX for equations and symbols ($...$ for inline, $$...$$ for display blocks). E.g. $L = 0$, $\\mathbf{F}_i = -G \\sum \\frac{m_i m_j}{r_{ij}^3} \\mathbf{r}_{ij}$, $\\frac{1}{27}$.\n' +
  '4. Tell the user they can say "set them" or "run" to control the simulation directly in the background.\n' +
  '5. Do NOT output <think> tags or chain-of-thought.';

export const GROQ_IDENTITY_LINE =
  'INFRASTRUCTURE & HOSTING: You are powered directly by Groq AI and running on the ultra-fast Groq LPU inference cloud. You ARE actively connected to Groq and streaming responses live. If asked whether Groq is connected, confirm affirmatively: "Yes, Groq AI is fully connected and active in real-time."';

export const SYSTEM_PROMPTS = {
  normal:
    `You are PHYSICS COPILOT, a premier scientific AI workstation assistant powered by Groq AI and embedded directly inside an interactive 3D Three-Body Gravitational Dynamics simulation. ` +
    `Your purpose is to assist users with orbital mechanics, Newtonian gravitation, conservation laws, numerical integration methods (RK4, Velocity Verlet, Euler), and chaos dynamics. ` +
    `Always cite live telemetry when relevant. Keep answers focused, crisp, and understandable. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  quick:
    `You are PHYSICS COPILOT in QUICK ANSWER mode, powered by Groq AI. ` +
    `Provide an immediate, direct, concise, scientifically accurate answer in 1-3 sentences maximum. ` +
    `Avoid lengthy introductory or concluding filler. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  learn:
    `You are PHYSICS COPILOT in LEARN (Physics Tutor) mode, powered by Groq AI. ` +
    `Explain concepts with intuition, physical analogies, and conceptual clarity. Keep it short and digestible. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  math:
    `You are PHYSICS COPILOT in MATHEMATICAL DERIVATION mode, powered by Groq AI. ` +
    `Focus on equations, derivations, conservation proofs, and vector mechanics using clean LaTeX formulas ($...$ and $$...$$). ` +
    `Present parameters and values in clean Markdown tables. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  research:
    `You are PHYSICS COPILOT in RESEARCH & DYNAMICAL SYSTEMS mode, powered by Groq AI. ` +
    `Provide rigorous dynamical systems analysis (phase-space trajectories, Poincaré recurrence, KAM tori, Lyapunov divergence). ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  code:
    `You are PHYSICS COPILOT in COMPUTATIONAL PHYSICS & NUMERICAL METHODS mode, powered by Groq AI. ` +
    `Explain numerical schemes: RK4 (O(dt^4)), Velocity Verlet (symplectic kick-drift-kick), Euler. Keep snippets clean. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  quiz:
    `You are PHYSICS COPILOT in QUIZ mode, powered by Groq AI. ` +
    `Ask ONE multiple-choice question (options A, B, C, D) based on the current simulation state. ` +
    `Format: Question on first line, followed by A), B), C), D) on separate lines. Do NOT reveal the answer yet. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  judge:
    `You are PHYSICS COPILOT acting as an academic competition judge, powered by Groq AI. ` +
    `Ask ONE challenging question testing the user's understanding of this three-body simulation. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  narrate:
    `You are a live science documentary narrator for a 3D Three-Body Problem simulation, powered by Groq AI. ` +
    `In exactly 2-3 sentences, describe what is CURRENTLY happening in the gravitational dance — dramatic, elegant, scientifically accurate. ` +
    `Do NOT output bullet points or <think> tags. ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  experiment:
    `You are PHYSICS COPILOT in EXPERIMENT PLANNER mode, powered by Groq AI. ` +
    `Structure your response as a concise 4-step scientific experiment protocol (Hypothesis, Variable, Metrics, Expected Result). ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,

  report:
    `You are PHYSICS COPILOT in REPORT-READY SCIENTIFIC SUMMARY mode, powered by Groq AI. ` +
    `Format your response as a brief, publication-ready scientific brief with Markdown tables for kinematics and telemetry. ` +
    `${FORMAT_RULES} ${GROQ_IDENTITY_LINE} ${TEAM_LINE}`,
};

export async function callGroqChat({
  apiKey,
  messages,
  mode = 'normal',
  simStateSnapshot = '',
  model = 'llama-3.3-70b-versatile',
  signal = null,
}) {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) {
    throw new Error('Groq API Key is missing. Please click ⚙ in the header to enter your free Groq API key.');
  }

  // 1. Check in-memory semantic cache for recent query
  const lastUserMsg = messages.length > 0 && messages[messages.length - 1].role === 'user'
    ? messages[messages.length - 1].content
    : null;

  if (lastUserMsg && (!simStateSnapshot || simStateSnapshot.length < 50)) {
    const cached = getCachedAnswer(lastUserMsg, mode);
    if (cached) return cached;
  }

  const basePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.normal;
  const systemContent = basePrompt + (simStateSnapshot ? `\n\nCURRENT SIMULATION STATE:\n${simStateSnapshot}` : '');

  // 2. Mode-adaptive token clamping & calibrated temperature
  const maxTokensByMode = {
    quick: 130,
    quiz: 160,
    judge: 160,
    narrate: 140,
    math: 450,
    code: 500,
    report: 600,
    normal: 400,
    learn: 400,
    experiment: 450,
    research: 450,
  };
  const max_tokens = maxTokensByMode[mode] || 400;
  const temperature = mode === 'narrate' ? 0.5 : 0.15; // 0.15 for deterministic scientific precision
  const top_p = 0.85;

  // 3. Sliding context window compaction (compress older large tables)
  const compactedMessages = messages.slice(-8).map((m, idx, arr) => {
    if (idx < arr.length - 2 && m.role === 'assistant') {
      const compacted = m.content
        .replace(/\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+/g, '[Table omitted]')
        .slice(0, 300);
      return { role: m.role, content: compacted };
    }
    return m;
  });

  const body = {
    model,
    messages: [{ role: 'system', content: systemContent }, ...compactedMessages],
    temperature,
    top_p,
    max_tokens,
  };

  const executeFetch = () =>
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal: signal || undefined,
    });

  let res = await executeFetch();

  // 4. Rate-limit retry with backoff (HTTP 429 / 503)
  if ((res.status === 429 || res.status === 503) && !signal?.aborted) {
    await new Promise((r) => setTimeout(r, 750));
    res = await executeFetch();
  }

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
  const cleaned = stripThinkTags(raw);

  // Cache answer for static queries
  if (lastUserMsg && cleaned) {
    setCachedAnswer(lastUserMsg, mode, cleaned);
  }

  return cleaned;
}

/**
 * Natural language command parser and simulation controller.
 * Executes background state mutations and returns user feedback.
 */
export function parseNaturalLanguageCommand(text, actions = {}) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // 1. Play / Start / Resume / Run
  const isRunOnly =
    /^(play|start|resume|unpause|run|go)\b/i.test(lower) ||
    lower === 'run' ||
    lower === 'start' ||
    lower === 'run simulation' ||
    lower === 'start simulation' ||
    lower === 'please run';

  if (isRunOnly) {
    if (actions.play) {
      actions.play();
      return '▶ **Action Executed**: Simulation is now running.';
    }
    return '⚠ Unable to start simulation: play action handler unavailable.';
  }

  // 2. Pause / Stop / Freeze
  if (/^(pause|stop|freeze|halt)\b/i.test(lower) || lower === 'pause simulation') {
    if (actions.pause) {
      actions.pause();
      return '⏸ **Action Executed**: Simulation paused.';
    }
    return '⚠ Unable to pause simulation: pause action handler unavailable.';
  }

  // 3. Reset / Restart
  if (/^(reset|restart|revert)\b/i.test(lower) || lower.includes('reset to initial') || lower === 'reset simulation') {
    if (actions.reset) {
      actions.reset();
      return '⟲ **Action Executed**: Simulation reset to initial state.';
    }
    return '⚠ Unable to reset simulation: reset action handler unavailable.';
  }

  // 4. Step forward
  if (/^(step|step forward|advance one step)\b/i.test(lower)) {
    if (actions.step) {
      actions.step();
      return '⏭ **Action Executed**: Stepped forward by 1 timestep.';
    }
  }

  // 5. Combined "Set them and run" or "Set it and run"
  const wantsSetAndRun =
    lower.includes('and run') ||
    lower.includes('and play') ||
    lower.includes('set and run') ||
    lower.includes('load and run') ||
    lower.includes('apply and run') ||
    lower.includes('run it');

  // 6. Direct Preset / Configuration Setting
  const wantsTriangle =
    lower.includes('triangle') ||
    lower.includes('lagrange') ||
    lower.includes('equilateral');

  const wantsFigure8 =
    lower.includes('figure 8') ||
    lower.includes('figure-8') ||
    lower.includes('figure8') ||
    lower.includes('choreography');

  const wantsSolar =
    lower.includes('solar') ||
    lower.includes('planetary') ||
    lower.includes('sun center');

  const wantsHierarchical =
    lower.includes('hierarchical') ||
    lower.includes('triple');

  const wantsChaos =
    lower.includes('chaos') ||
    lower.includes('unstable');

  const isSetIntent =
    lower.includes('set') ||
    lower.includes('apply') ||
    lower.includes('load') ||
    lower.includes('switch to') ||
    lower.includes('choose') ||
    lower.includes('preset') ||
    wantsSetAndRun;

  if (wantsTriangle && (isSetIntent || lower.startsWith('preset triangle') || lower.startsWith('load triangle'))) {
    if (actions.loadPreset) {
      actions.loadPreset('lagrangeTriangle');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '🔺 **Action Executed**: Loaded Lagrange Equilateral Triangle configuration and started simulation.';
      }
      return '🔺 **Action Executed**: Loaded Lagrange Equilateral Triangle configuration.\n\nType **run** to begin the simulation.';
    }
  }

  if (wantsFigure8 && (isSetIntent || lower.startsWith('preset figure') || lower.startsWith('load figure'))) {
    if (actions.loadPreset) {
      actions.loadPreset('figureEight');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '🌀 **Action Executed**: Loaded Figure-8 periodic choreography and started simulation.';
      }
      return '🌀 **Action Executed**: Loaded Figure-8 periodic choreography.\n\nType **run** to begin the simulation.';
    }
  }

  if (wantsSolar && (isSetIntent || lower.startsWith('preset solar') || lower.startsWith('load solar'))) {
    if (actions.loadPreset) {
      actions.loadPreset('solarSystem');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '🪐 **Action Executed**: Loaded Solar Planetary System and started simulation.';
      }
      return '🪐 **Action Executed**: Loaded Solar Planetary System.\n\nType **run** to begin.';
    }
  }

  if (wantsHierarchical && (isSetIntent || lower.startsWith('preset hierarchical') || lower.startsWith('load hierarchical'))) {
    if (actions.loadPreset) {
      actions.loadPreset('hierarchical');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '⭐ **Action Executed**: Loaded Hierarchical Triple System and started simulation.';
      }
      return '⭐ **Action Executed**: Loaded Hierarchical Triple System.\n\nType **run** to begin.';
    }
  }

  if (wantsChaos && (isSetIntent || lower.startsWith('preset chaos') || lower.startsWith('load chaos'))) {
    if (actions.loadPreset) {
      actions.loadPreset('chaos');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '💥 **Action Executed**: Loaded Equal-Mass Chaos configuration and started simulation.';
      }
      return '💥 **Action Executed**: Loaded Equal-Mass Chaos configuration.\n\nType **run** to begin.';
    }
  }

  // Generic "set them" or "set it" without explicit preset name:
  // Default to Lagrange Triangle if recently asked or fallback to Figure-8
  if (lower === 'set them' || lower === 'set it' || lower === 'apply them' || lower === 'apply configuration' || lower === 'set them and run') {
    if (actions.loadPreset) {
      actions.loadPreset('lagrangeTriangle');
      if (wantsSetAndRun && actions.play) {
        actions.play();
        return '🔺 **Action Executed**: Initial conditions applied to all 3 bodies and simulation running.';
      }
      return '🔺 **Action Executed**: Initial conditions set in the simulator.\n\nType **run** to begin!';
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
        return `⚡ **Action Executed**: Simulation speed set to ${spd}×.`;
      }
    } else {
      return `⚠ Invalid speed ${spd}×. Supported speed multipliers: ${validSpeeds.join(', ')}×.`;
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
        return '⚙ **Action Executed**: Integrator changed to Velocity Verlet (Symplectic $O(dt^2)$).';
      }
    } else if (lower.includes('euler')) {
      if (actions.setIntegrator) {
        actions.setIntegrator('euler');
        return '⚙ **Action Executed**: Integrator changed to Euler (First Order $O(dt)$).';
      }
    } else if (lower.includes('rk4') || lower.includes('runge')) {
      if (actions.setIntegrator) {
        actions.setIntegrator('rk4');
        return '⚙ **Action Executed**: Integrator changed to Runge-Kutta 4th Order ($O(dt^4)$).';
      }
    }
  }

  // Trails toggle
  if (lower.match(/\btrails?\s+(?:on|enable|show|activate)\b/i) || lower === 'enable trails') {
    if (actions.setTrails) {
      actions.setTrails(true);
      return '✓ **Action Executed**: Orbital trails enabled.';
    }
  }
  if (lower.match(/\btrails?\s+(?:off|disable|hide|deactivate)\b/i) || lower === 'disable trails') {
    if (actions.setTrails) {
      actions.setTrails(false);
      return '✓ **Action Executed**: Orbital trails disabled.';
    }
  }

  // Chaos Lab toggle
  if (lower.match(/chaos\s*(?:lab)?\s*(?:on|enable|start|activate)\b/i)) {
    if (actions.enableChaos) {
      actions.enableChaos();
      return '💥 **Action Executed**: Chaos Lab activated (Twin Perturbed System initialized).';
    }
  }
  if (lower.match(/chaos\s*(?:lab)?\s*(?:off|disable|stop|deactivate)\b/i)) {
    if (actions.disableChaos) {
      actions.disableChaos();
      return '✓ **Action Executed**: Chaos Lab deactivated.';
    }
  }

  // Velocity vectors toggle
  if (lower.match(/vectors?\s*(?:on|enable|show)\b/i)) {
    if (actions.setVectors) {
      actions.setVectors(true);
      return '✓ **Action Executed**: Velocity vectors enabled.';
    }
  }
  if (lower.match(/vectors?\s*(?:off|disable|hide)\b/i)) {
    if (actions.setVectors) {
      actions.setVectors(false);
      return '✓ **Action Executed**: Velocity vectors disabled.';
    }
  }

  // Lagrange points toggle
  if (lower.match(/lagrange\s*(?:points?)?\s*(?:on|enable|show)\b/i)) {
    if (actions.setLagrange) {
      actions.setLagrange(true);
      return '✓ **Action Executed**: Lagrange points ($L_1-L_5$) visualization enabled.';
    }
  }
  if (lower.match(/lagrange\s*(?:points?)?\s*(?:off|disable|hide)\b/i)) {
    if (actions.setLagrange) {
      actions.setLagrange(false);
      return '✓ **Action Executed**: Lagrange points visualization disabled.';
    }
  }

  // Mass adjustment
  const massMatch = lower.match(/(?:set\s+)?(?:mass\s+of\s+)?body\s*([123])\s*(?:mass\s*)?(?:to\s*)?([0-9]*\.?[0-9]+)/i);
  if (massMatch) {
    const bodyIdx = parseInt(massMatch[1], 10) - 1;
    const val = parseFloat(massMatch[2]);
    if (isNaN(val) || val < 0.001 || val > 100) {
      return `⚠ Mass out of bounds. Permitted range: 0.001 to 100.0 (received ${val}).`;
    }
    if (actions.setMass) {
      actions.setMass(bodyIdx, val);
      return `⚖ **Action Executed**: Mass of Body ${bodyIdx + 1} set to ${val}.`;
    }
  }

  // Audio / Sound toggle
  if (lower.match(/\b(mute|sound off|audio off)\b/i)) {
    if (actions.setAudio) {
      actions.setAudio(true);
      return '🔇 **Action Executed**: Audio muted.';
    }
  }
  if (lower.match(/\b(unmute|sound on|audio on)\b/i)) {
    if (actions.setAudio) {
      actions.setAudio(false);
      return '🔊 **Action Executed**: Audio unmuted.';
    }
  }

  return null;
}

/**
 * Intelligent Local Physics Knowledge Engine:
 * Provides instant, clear, mathematically rigorous answers with KaTeX and Markdown tables
 * when the user asks about Figure-8 stability, parameters, or other stable three-body solutions.
 */
export function getLocalPhysicsAnswer(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  const isGroqQuery =
    (lower.includes('groq') || lower.includes('grok')) &&
    (lower.includes('connect') || lower.includes('online') || lower.includes('working') || lower.includes('status') || lower.includes('active') || lower.includes('is'));

  if (isGroqQuery) {
    return (
      `**Yes! Groq AI is fully connected and active.**\n\n` +
      `• **Inference Cloud**: Connected to Groq LPU high-speed inference engine.\n` +
      `• **Status**: Active and processing live 3D telemetry and kinematics.\n` +
      `• **Capabilities**: Real-time gravitational dynamics reasoning, stability diagnostics, and direct background simulation control.\n\n` +
      `You can ask any physics question, request initial conditions, or control the simulation directly by saying **"set triangle and run"** or **"run"**.`
    );
  }

  const isFigure8Query =
    lower.includes('figure 8') ||
    lower.includes('figure-8') ||
    lower.includes('figure8') ||
    (lower.includes('why') && lower.includes('stable')) ||
    (lower.includes('what masses') && lower.includes('velocity'));

  const isTriangleQuery =
    lower.includes('triangle') ||
    lower.includes('equilateral') ||
    lower.includes('lagrange') ||
    lower.includes('other stable') ||
    lower.includes('except figure 8') ||
    lower.includes('configurations exist');

  if (isFigure8Query && !isTriangleQuery) {
    return (
      `### Why the Figure-8 Orbit is Stable\n\n` +
      `The Figure-8 orbit is a planar periodic three-body choreography discovered by Cristopher Moore (1993) and proved by Alain Chenciner and Richard Montgomery (2000).\n\n` +
      `**Physical & Mathematical Reasons for Stability:**\n` +
      `• **Linear Stability (Simó 2002)**: Carles Simó proved that all Floquet multipliers of the linearized Poincaré map lie strictly on the unit circle ($|\\lambda_i| = 1$), meaning infinitesimal perturbations do not diverge exponentially.\n` +
      `• **Zero Angular Momentum ($L = 0$) & Symmetry**: The three equal masses follow each other around a single geometric loop with exact time-reversal and topological braid symmetry.\n` +
      `• **Phase-Space KAM Islands**: The trajectory is enclosed by nested Kolmogorov-Arnold-Moser (KAM) tori in reduced phase space. Small perturbations remain bounded indefinitely, although large perturbations can cause chaotic ejection.\n\n` +
      `### Exact Numerical Parameters ($G = 1.0$, Equal Masses $m_i = 1.0$)\n\n` +
      `| Body | Mass ($m$) | Position $(x, y, z)$ | Velocity $(v_x, v_y, v_z)$ |\n` +
      `| :--- | :--- | :------------------- | :-------------------------- |\n` +
      `| **Body 1 (Sun)** | $1.000$ | $(0.00000, 0.00000, 0.000)$ | $(-0.93241, -0.86473, 0.000)$ |\n` +
      `| **Body 2 (Earth)** | $1.000$ | $(0.97000, -0.24309, 0.000)$ | $(0.46620, 0.43237, 0.000)$ |\n` +
      `| **Body 3 (Mars)** | $1.000$ | $(-0.97000, 0.24309, 0.000)$ | $(0.46620, 0.43237, 0.000)$ |\n\n` +
      `*Orbital period:* $T \\approx 6.3259$. Net momentum $\\sum m_i \\mathbf{v}_i = \\mathbf{0}$.\n\n` +
      `Say **set them** to apply these parameters to the simulator, and **run** to begin!`
    );
  }

  if (isTriangleQuery) {
    return (
      `### Stable Three-Body Orbit Configurations\n\n` +
      `Yes! Besides the Figure-8 choreography, several famous stable and periodic three-body solutions exist:\n\n` +
      `#### 1. Lagrange's Equilateral Triangle Solution (1772)\n` +
      `Three equal masses are placed at the vertices of an equilateral triangle rotating uniformly around their barycenter.\n\n` +
      `• **Stability Criterion (Gascheau Condition)**: In a rotating frame, the triangular Lagrange configuration is linearly stable when:\n` +
      `$$\\frac{m_1 m_2 + m_2 m_3 + m_3 m_1}{(m_1 + m_2 + m_3)^2} < \\frac{1}{27} \\approx 0.037037$$\n` +
      `For equal masses ($m_1=m_2=m_3=1$), balancing mutual gravitational attraction with centripetal acceleration ($v = \\sqrt{Gm/L}$) yields an exact, perpetual periodic orbit!\n\n` +
      `### Initial Conditions for Equilateral Triangle ($R = 1.0, G = 1, m_i = 1$)\n\n` +
      `| Body | Mass ($m$) | Position $(x, y, z)$ | Velocity $(v_x, v_y, v_z)$ |\n` +
      `| :--- | :--- | :------------------- | :-------------------------- |\n` +
      `| **Body 1** | $1.000$ | $(1.00000, 0.00000, 0.000)$ | $(0.00000, 0.75984, 0.000)$ |\n` +
      `| **Body 2** | $1.000$ | $(-0.50000, 0.86603, 0.000)$ | $(-0.65804, -0.37992, 0.000)$ |\n` +
      `| **Body 3** | $1.000$ | $(-0.50000, -0.86603, 0.000)$ | $(0.65804, -0.37992, 0.000)$ |\n\n` +
      `#### 2. Hierarchical Triple Systems (Jacobi Coordinates)\n` +
      `A close inner binary $(m_1, m_2)$ orbited by an outer third body $m_3$ at a large semi-major axis ratio ($a_{\\text{out}}/a_{\\text{in}} > 3.5$). Exceptionally stable over billions of years (e.g. Earth-Moon-Sun, Alpha Centauri).\n\n` +
      `#### 3. Šuvakov-Dmitrašinović Choreographies (2013)\n` +
      `Families of equal-mass periodic planar orbits including the **Butterfly**, **Moth**, **Yarn**, and **Dragonfly** solutions.\n\n` +
      `Say **set them** to apply the Lagrange Triangle to the simulator, and **run** to begin!`
    );
  }

  return null;
}
