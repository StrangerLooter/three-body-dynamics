import { vAdd, vScale, vSub, vDot } from './vectorMath.js';
import { computeAccelerations, derivative } from './gravity.js';

export function stateAdd(s1, s2, scale) {
  return {
    pos: s1.pos.map((p, i) => vAdd(p, vScale(s2.pos[i], scale))),
    vel: s1.vel.map((v, i) => vAdd(v, vScale(s2.vel[i], scale))),
  };
}

/**
 * Standard Forward Euler Integrator (First order)
 */
export function stepEuler(state, masses, G, dt) {
  const d = derivative(state, masses, G);
  return stateAdd(state, d, dt);
}

/**
 * Velocity Verlet Symplectic Integrator (Second order)
 */
export function stepVelocityVerlet(state, masses, G, dt) {
  const acc0 = computeAccelerations(state.pos, masses, G);
  const pos = state.pos.map((p, i) =>
    vAdd(vAdd(p, vScale(state.vel[i], dt)), vScale(acc0[i], 0.5 * dt * dt))
  );
  const acc1 = computeAccelerations(pos, masses, G);
  const vel = state.vel.map((v, i) =>
    vAdd(v, vScale(vAdd(acc0[i], acc1[i]), 0.5 * dt))
  );
  return { pos, vel };
}

/**
 * Classical Runge-Kutta 4th Order Integrator (RK4)
 */
export function stepRK4(state, masses, G, dt) {
  const k1 = derivative(state, masses, G);
  const k2 = derivative(stateAdd(state, k1, dt / 2), masses, G);
  const k3 = derivative(stateAdd(state, k2, dt / 2), masses, G);
  const k4 = derivative(stateAdd(state, k3, dt), masses, G);

  const combine = (arr) =>
    state.pos.map((_, i) =>
      vScale(
        vAdd(
          vAdd(arr.k1[i], vScale(arr.k2[i], 2)),
          vAdd(vScale(arr.k3[i], 2), arr.k4[i])
        ),
        dt / 6
      )
    );

  const dPos = combine({ k1: k1.pos, k2: k2.pos, k3: k3.pos, k4: k4.pos });
  const dVel = combine({ k1: k1.vel, k2: k2.vel, k3: k3.vel, k4: k4.vel });

  return {
    pos: state.pos.map((p, i) => vAdd(p, dPos[i])),
    vel: state.vel.map((v, i) => vAdd(v, dVel[i])),
  };
}

/**
 * Dynamic integrator dispatcher
 */
export function integrateStep(state, masses, G, dt, method = 'rk4') {
  if (method === 'euler') return stepEuler(state, masses, G, dt);
  if (method === 'verlet') return stepVelocityVerlet(state, masses, G, dt);
  return stepRK4(state, masses, G, dt);
}

/**
 * Adaptive step via Step-Doubling on RK4 for local truncation error estimation.
 */
export function stepDoubling(state, masses, G, dt) {
  const full = stepRK4(state, masses, G, dt);
  const halfA = stepRK4(state, masses, G, dt / 2);
  const halfB = stepRK4(halfA, masses, G, dt / 2);
  let errSq = 0;
  for (let i = 0; i < state.pos.length; i++) {
    const d = vSub(halfB.pos[i], full.pos[i]);
    errSq += vDot(d, d);
  }
  return { result: halfB, err: Math.sqrt(errSq) };
}
