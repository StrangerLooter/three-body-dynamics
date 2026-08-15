# Three-Body Dynamics

**A professional 3D numerical simulation of the classical Three-Body Problem**
Built by **Ram Vishwakarma** — B.Sc. Physics (Hons.), IEHE Bhopal | College Model Competition Project

🌐 **Live:** https://3bp-mu.vercel.app

---

## Features (Phases 1–8)

| Phase | Feature |
|-------|---------|
| 1 | RK4 physics engine, 3D scene, starfield, play/pause/reset |
| 2 | 9 camera modes (Follow Body, COM, Top/Front/Side, Auto Orbit) |
| 3 | Adaptive timestep, close-encounter softening, body editing |
| 4 | Full telemetry — energy, momentum, pairwise distances |
| 5 | Analysis drawer — SVG graphs for energy/momentum/error/distances |
| 6 | Chaos Lab — twin systems A/B, perturbation, approx. Lyapunov exponent |
| 7 | Gravitational field viz — field lines, vector field, particle flow, potential contours |
| 8 | Export CSV/JSON, screenshot, fullscreen, keyboard shortcuts, AI chatbot (Groq) |

## Extra Upgrades
- **Real planet textures** — Earth, Moon, Venus loaded from CDN
- **Spacetime fabric grid** — white mesh warped by real gravitational potential
- **AI Physics Assistant** — Groq-powered chatbot with live simulation context

## Run Locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

## Tech Stack
- React 18 + Three.js (raw, no R3F)
- Vite 5
- Tailwind CSS (CDN)
- Groq API (llama-3.3-70b-versatile)

## Physics
- Newtonian gravity: `a_i = G Σ m_j (r_j - r_i) / |r_j - r_i|³`
- Integrators: RK4 (default), Velocity Verlet, Euler
- Conservation: total energy, linear momentum, angular momentum
- Dimensionless normalized units

---
*Made with AI tools (Claude by Anthropic) — Ram Vishwakarma, 2026*
