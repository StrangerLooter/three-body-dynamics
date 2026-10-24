import assert from 'node:assert';
import {
  buildSimSnapshot,
  parseNaturalLanguageCommand,
  stripThinkTags,
  SYSTEM_PROMPTS,
  TEAM_LINE,
} from '../src/services/aiService.js';
import { PRESETS } from '../src/physics/presets.js';

console.log('🧪 Starting AI Service & Command Parser Test Suite...\n');

// 1. Test stripThinkTags
const thinkSample = '<think>Internal secret chain of thought</think>Final scientific answer.';
assert.strictEqual(stripThinkTags(thinkSample), 'Final scientific answer.', 'stripThinkTags should remove think tags');
console.log('  ✅ PASS: stripThinkTags correctly strips thinking tags');

// 2. Test TEAM_LINE and SYSTEM_PROMPTS
assert.ok(TEAM_LINE.includes('Ram Vishwakarma'), 'Team line contains Ram Vishwakarma');
assert.ok(TEAM_LINE.includes('Parth Thakur'), 'Team line contains Parth Thakur');
assert.ok(TEAM_LINE.includes('Lucky Thorat'), 'Team line contains Lucky Thorat');
assert.ok(TEAM_LINE.includes('Prabhas Kasanya'), 'Team line contains Prabhas Kasanya');
const modes = ['normal', 'quick', 'learn', 'math', 'research', 'code', 'quiz', 'judge', 'narrate', 'experiment', 'report'];
for (const m of modes) {
  assert.ok(SYSTEM_PROMPTS[m], `SYSTEM_PROMPTS should have mode: ${m}`);
}
console.log('  ✅ PASS: SYSTEM_PROMPTS supports all required physics modes and team attribution');

// 3. Test buildSimSnapshot
const preset = PRESETS.figureEight();
const mockSim = {
  presetKey: 'figureEight',
  masses: preset.masses,
  state: preset.state,
  G: 1,
  dt: 0.006,
  integrator: 'rk4',
  running: true,
  simTime: 12.345,
  initialEnergy: -1.5,
  chaosOn: false,
};
const snapshot = buildSimSnapshot(mockSim);
assert.ok(snapshot.includes('FIGUREEIGHT') || snapshot.includes('figureEight'), 'Snapshot contains preset');
assert.ok(snapshot.includes('RK4'), 'Snapshot contains integrator');
assert.ok(snapshot.includes('Total Energy'), 'Snapshot contains total energy');
assert.ok(snapshot.includes('drift'), 'Snapshot contains energy drift calculation');
assert.ok(snapshot.includes('Pairwise Distances'), 'Snapshot contains pairwise distances');
console.log('  ✅ PASS: buildSimSnapshot generates complete scientific telemetry');

// 4. Test parseNaturalLanguageCommand actions
let actionsInvoked = {};
const testActions = {
  play: () => (actionsInvoked.play = true),
  pause: () => (actionsInvoked.pause = true),
  reset: () => (actionsInvoked.reset = true),
  step: () => (actionsInvoked.step = true),
  setSpeed: (s) => (actionsInvoked.speed = s),
  loadPreset: (p) => (actionsInvoked.preset = p),
  setIntegrator: (i) => (actionsInvoked.integrator = i),
  setTrails: (v) => (actionsInvoked.trails = v),
  enableChaos: () => (actionsInvoked.chaos = true),
  disableChaos: () => (actionsInvoked.chaos = false),
  setVectors: (v) => (actionsInvoked.vectors = v),
  setLagrange: (v) => (actionsInvoked.lagrange = v),
  setMass: (idx, m) => (actionsInvoked.mass = { idx, m }),
  setAudio: (m) => (actionsInvoked.audio = m),
};

// Play command
let res = parseNaturalLanguageCommand('pause', testActions);
assert.strictEqual(actionsInvoked.pause, true, 'Pause invoked');

res = parseNaturalLanguageCommand('resume simulation', testActions);
assert.strictEqual(actionsInvoked.play, true, 'Play invoked');

res = parseNaturalLanguageCommand('reset to initial', testActions);
assert.strictEqual(actionsInvoked.reset, true, 'Reset invoked');

res = parseNaturalLanguageCommand('step forward', testActions);
assert.strictEqual(actionsInvoked.step, true, 'Step invoked');

res = parseNaturalLanguageCommand('speed 2', testActions);
assert.strictEqual(actionsInvoked.speed, 2, 'Speed 2 set');

res = parseNaturalLanguageCommand('load figure-8 orbit', testActions);
assert.strictEqual(actionsInvoked.preset, 'figureEight', 'Preset figureEight loaded');

res = parseNaturalLanguageCommand('switch to verlet integrator', testActions);
assert.strictEqual(actionsInvoked.integrator, 'verlet', 'Verlet integrator set');

res = parseNaturalLanguageCommand('trails on', testActions);
assert.strictEqual(actionsInvoked.trails, true, 'Trails enabled');

res = parseNaturalLanguageCommand('chaos lab on', testActions);
assert.strictEqual(actionsInvoked.chaos, true, 'Chaos enabled');

res = parseNaturalLanguageCommand('set mass of body 1 to 4.5', testActions);
assert.deepStrictEqual(actionsInvoked.mass, { idx: 0, m: 4.5 }, 'Body 1 mass set to 4.5');

// Invalid commands check
res = parseNaturalLanguageCommand('speed 999', testActions);
assert.ok(res.includes('Invalid speed'), 'Rejects out-of-bounds speed');

res = parseNaturalLanguageCommand('set mass of body 1 to 500', testActions);
assert.ok(res.includes('Mass out of bounds'), 'Rejects mass > 100');

res = parseNaturalLanguageCommand('set unknown thing to 123', testActions);
assert.ok(res.includes('Unrecognized or ambiguous command'), 'Provides help for invalid command');

res = parseNaturalLanguageCommand('What is the physical significance of Lagrange points?', testActions);
assert.strictEqual(res, null, 'Returns null for general questions');

console.log('  ✅ PASS: parseNaturalLanguageCommand correctly validates and executes supported actions\n');
console.log('🎉 All AI Service tests completed successfully!');
