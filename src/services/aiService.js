import {
  computeEnergy,
  computeMomentum,
  computeAngularMomentum,
  computeCOM,
  computePairDistances,
  computeSeparation,
  vLen,
} from '../physics/index.js';

export const GROQ_STORAGE_KEY = 'groq_api_key';

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

export function buildSimSnapshot(sim, sysB = null) {
  if (!sim) return '';
  const energy = computeEnergy(sim.state, sim.masses, sim.G);
  const p = computeMomentum(sim.state, sim.masses);
  const L = computeAngularMomentum(sim.state, sim.masses);
  const com = computeCOM(sim.state, sim.masses);
  const dist = computePairDistances(sim.state);

  const bodiesDesc = [0, 1, 2]
    .map(
      (i) =>
        `Body ${i + 1} (mass ${sim.masses[i].toFixed(3)}): pos=(${sim.state.pos[i]
          .map((v) => v.toFixed(3))
          .join(', ')}) vel=(${sim.state.vel[i].map((v) => v.toFixed(3)).join(', ')})`
    )
    .join('\n');

  let chaosLine = `Chaos Lab: ${sim.chaosOn ? 'ON' : 'OFF'}`;
  if (sim.chaosOn && sysB) {
    const sep = computeSeparation(sim.state, sysB.state);
    chaosLine += `, divergence=${sep.toExponential(3)}, initial=${(
      sim.chaosInitialSep || 1e-6
    ).toExponential(3)}`;
  }

  return [
    `Preset: ${sim.presetKey} | Integrator: ${sim.integrator.toUpperCase()} | dt=${sim.dt.toExponential(
      2
    )} | G=${sim.G} | T=${sim.simTime.toFixed(3)}s | Running=${sim.running}`,
    bodiesDesc,
    `KE=${energy.KE.toFixed(4)} | PE=${energy.PE.toFixed(4)} | E_total=${energy.total.toFixed(4)}`,
    `|P|=${vLen(p).toFixed(4)} | |L|=${vLen(L).toFixed(4)}`,
    `COM=(${com.map((v) => v.toFixed(3)).join(', ')})`,
    `Distances: B1-B2=${dist.pairs.d01.toFixed(3)} | B1-B3=${dist.pairs.d02.toFixed(
      3
    )} | B2-B3=${dist.pairs.d12.toFixed(3)}`,
    chaosLine,
  ].join('\n');
}

const TEAM_LINE =
  'Project team: Ram, Abhishek, and Mukul. If asked who built/developed this or who the team is, answer exactly: Ram, Abhishek, and Mukul. Do not invent roles or additional members.';

const FORMAT_RULES =
  'Response rules: Be concise and scientifically accurate. Aim for 3-6 sentences for most answers. Use plain-text math notation (^, sqrt(), *). Do NOT output <think>, internal reasoning, or chain-of-thought — only the final answer. Structure answers clearly with short paragraphs if needed. Target audience: college physics students.';

export const SYSTEM_PROMPTS = {
  normal:
    `You are an AI physics tutor inside a live 3D Three-Body Problem simulator (Newtonian gravity, RK4/Verlet/Euler integrators, Chaos Lab, gravitational field visualisation). ` +
    `Answer questions about orbital mechanics, gravity, conservation laws, numerical integration, and chaos theory. Use the live simulation data when relevant. ` +
    `${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,
  narrate:
    `You are a live science narrator for a 3D Three-Body Problem simulator. ` +
    `In exactly 2-3 sentences, describe what is CURRENTLY happening — like a nature documentary voiceover. ` +
    `Mention at least one specific value (energy, speed, distance) from the data. Be vivid but scientifically accurate. ` +
    `Do NOT output <think> tags or internal reasoning. Output only the narration text, nothing else. ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,
  quiz:
    `You are a physics quiz master for a Three-Body Problem simulator. ` +
    `Ask ONE multiple-choice question (A/B/C/D) directly related to what is happening in the simulation right now. ` +
    `Format: Question on first line, then A) B) C) D) on separate lines. Keep it educational and concise. ` +
    `Do NOT output <think> tags. ${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,
  judge:
    `You are a physics professor judging a student's Three-Body Problem simulator at a college model competition. ` +
    `Ask ONE focused question about the physics, numerical methods, or implementation. Reference the current simulation state. ` +
    `Alternate between conceptual and technical questions. Be specific and rigorous. ` +
    `Do NOT output <think> tags. ${FORMAT_RULES} ${TEAM_LINE}\n\nCURRENT SIMULATION STATE:\n`,
};

export async function callGroqChat({
  apiKey,
  messages,
  mode = 'normal',
  simStateSnapshot = '',
  model = 'openai/gpt-oss-120b',
}) {
  const effectiveKey = apiKey || getStoredApiKey();
  if (!effectiveKey) {
    throw new Error('Groq API Key is missing. Please add VITE_GROQ_API_KEY in your .env or Vercel environment variables.');
  }

  const basePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.normal;
  const systemContent = basePrompt + simStateSnapshot;

  const temperature = mode === 'narrate' ? 0.6 : 0.25;
  const max_tokens = mode === 'narrate' ? 120 : 450;

  // Build payload without invalid reasoning_effort parameters
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
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API Error (${res.status}): ${errText.slice(0, 240)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '(No response received)';
  return stripThinkTags(raw);
}

export function parseNaturalLanguageCommand(text, actions) {
  const lower = text.toLowerCase();

  if (lower.match(/\bpause\b|\bstop\b/)) {
    actions.pause?.();
    return '⏸ Simulation paused.';
  }
  if (lower.match(/\bplay\b|\bstart\b|\bresume\b/)) {
    actions.play?.();
    return '▶ Simulation running.';
  }
  if (lower.match(/\breset\b/)) {
    actions.reset?.();
    return '⟲ Reset to initial conditions.';
  }

  const speedMatch = lower.match(/speed.*?(0\.1|0\.25|0\.5|\b1\b|\b2\b|\b10\b|\b100\b)/);
  if (speedMatch) {
    const spd = parseFloat(speedMatch[1]);
    if ([0.1, 0.25, 0.5, 1, 2, 10, 100].includes(spd)) {
      actions.setSpeed?.(spd);
      return `⚡ Speed set to ${spd}×.`;
    }
  }

  if (lower.includes('figure') || lower.includes('figure-8') || lower.includes('figure8')) {
    actions.loadPreset?.('figureEight');
    return '🌀 Loaded Figure-8 Orbit.';
  }
  if (lower.includes('chaos') && lower.includes('preset')) {
    actions.loadPreset?.('chaos');
    return '💥 Loaded Equal-Mass Chaos.';
  }
  if (lower.includes('hierarchical')) {
    actions.loadPreset?.('hierarchical');
    return '⭐ Loaded Hierarchical Triple.';
  }
  if (lower.includes('restricted')) {
    actions.loadPreset?.('restricted');
    return '🔬 Loaded Restricted Three-Body.';
  }
  if (lower.includes('trail') && lower.includes('on')) {
    actions.setTrails?.(true);
    return '✓ Trails enabled.';
  }
  if (lower.includes('trail') && lower.includes('off')) {
    actions.setTrails?.(false);
    return '✓ Trails disabled.';
  }

  return null;
}
