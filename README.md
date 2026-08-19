# Three-Body Dynamics

**An observatory-grade 3D numerical simulation & chaos laboratory for the classical Three-Body Problem**

Built by **Ram Vishwakarma, Abhishek, and Mukul** — B.Sc. Physics (Hons.), IEHE Bhopal | College Model Competition Project

🌐 **Live Demo:** [https://three-body-dynamics.vercel.app](https://three-body-dynamics.vercel.app)

---

## 🌌 Overview

Three-Body Dynamics is a real-time, interactive, GPU-accelerated numerical simulator and physics laboratory. Built using Three.js and React 18, it couples high-accuracy numerical integrators (RK4, Velocity Verlet, Euler) with atmospheric Rayleigh scattering shaders, dynamic spacetime fabric curvature, Lagrange equilibrium solvers ($L_1–L_5$), procedural gravitational wave audio sonification, and an AI physics tutor.

---

## 🚀 Key Features

| Domain | Features |
|---|---|
| **Photorealistic Visuals** | Atmospheric Rayleigh Fresnel glow shaders, velocity-gradient dynamic orbital trails, multi-temperature starfield, cosmic dust nebulae |
| **Physics Engine** | 4th-Order Runge-Kutta (RK4), Velocity Verlet, Euler integrators with adaptive step doubling & singularity softening |
| **Lagrange Equilibrium** | Real-time calculation and 3D visualization of the 5 Lagrange points ($L_1, L_2, L_3, L_4, L_5$) |
| **Gravitational Audio** | Procedural Web Audio API sonification of orbital acceleration, gravitational wave chirps on close approach, and deep-space drone |
| **Spacetime Mesh** | 3D tension-colored fabric mesh dynamically warped according to the exact gravitational potential well $U(r)$ |
| **Chaos Lab** | Real-time twin system perturbation ($A/B$), divergence tracking, and numerical Lyapunov exponent ($\lambda$) estimation |
| **Gravitational Field** | Directional field lines, magnitude-encoded vector fields, potential well heatmap contours, tracer particle flow |
| **Phase Space Analysis** | 2D $(x, v_x)$ state-space attractor trajectories, energy/momentum conservation charts, and CSV/JSON export |
| **AI Physics Tutor** | Groq-powered assistant with live telemetry awareness, TTS voice narration, physics quizzes, and judge mode |
| **Camera & Control** | 9 camera modes (Free Orbit, Follow Body 1–3, Follow COM, Orthographic Top/Front/Side, Auto Orbit), full hotkey suite |

---

## 🛠️ Architecture & Folder Structure

```
three-body-dynamics/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules (node_modules, .env, dist)
├── index.html                # Application entry HTML with JetBrains Mono font
├── package.json              # Dependencies and build scripts
├── vercel.json               # Vercel deployment configuration
├── vite.config.js            # Vite build configuration with Rollup chunk splitting
└── src/
    ├── App.jsx               # Master orchestrator component
    ├── main.jsx              # React root mount
    ├── index.css             # Theme tokens, custom dark scrollbars, and glows
    ├── Simulator.jsx         # Backward-compatibility alias export
    ├── physics/              # Pure mathematical and physics algorithms
    │   ├── vectorMath.js     # 3D vector arithmetic (pure math, 0 dependencies)
    │   ├── gravity.js        # Newtonian mutual gravity and field potential
    │   ├── integrators.js    # Euler, Velocity Verlet, RK4, Step-doubling adaptive
    │   ├── conservation.js   # Energy, momentum, COM, and distance metrics
    │   ├── chaos.js          # Phase-space divergence and Lyapunov calculation
    │   ├── presets.js        # Figure-8, Hierarchical, Chaos, Restricted configurations
    │   ├── lagrange.js       # Real-time L1-L5 Lagrange equilibrium point solver
    │   └── index.js          # Barrel export
    ├── constants/            # Constants and configuration
    │   ├── bodies.js         # Textures, colors, radius, spin rates, trail buffers
    │   ├── cameraModes.js    # Camera tracking modes
    │   ├── exportKeys.js     # Telemetry CSV/JSON headers
    │   ├── shortcuts.js      # Hotkey definitions
    │   └── index.js          # Barrel export
    ├── services/             # External integration and export services
    │   ├── aiService.js      # Groq API client with state snapshotting & NLP control
    │   ├── speechService.js  # Web Speech API text-to-speech synthesis
    │   ├── audioService.js   # Procedural Web Audio gravitational wave sonification
    │   └── exportService.js  # CSV/JSON file generation and canvas screenshots
    ├── hooks/                # Custom React hooks
    │   ├── useThreeSimulation.js # Three.js scene, renderer, particle loop, controls
    │   └── useKeyboardShortcuts.js # Global hotkey listeners
    └── components/           # Reusable UI component layer
        ├── common/           # Buttons, numeric inputs, section layouts, toggles
        ├── overlay/          # Welcome screen, shortcuts modal, WebGL error fallback
        ├── panels/           # Top status bar, bottom transport bar, control panels
        ├── analysis/         # Telemetry drawer & scalable SVG MultiLineChart
        └── chat/             # Groq AI tutor panel & API key configuration modal
```

---

## ⚡ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/StrangerLooter/three-body-dynamics.git
cd three-body-dynamics
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables (Optional)
```bash
cp .env.example .env
```
Add your free Groq API key in `.env` or configure it directly in the in-app settings (⚙):
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### 4. Start local development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `SPACE` | Play / Pause simulation |
| `R` | Reset to initial conditions |
| `F` | Focus camera on selected body |
| `C` | Cycle through camera modes |
| `T` | Toggle particle orbital trails |
| `V` | Toggle velocity vector arrows |
| `L` | Toggle Lagrange equilibrium points ($L_1–L_5$) |
| `M` | Toggle audio sonification & cosmic drone |
| `A` | Toggle analysis telemetry drawer |
| `?` | Toggle keyboard shortcuts overlay |
| `ESC` | Close active modals / drawers |

---

## 📜 Physics Principles

- **Newton's Law of Universal Gravitation:**
  $$\vec{a}_i = G \sum_{j \neq i} \frac{m_j (\vec{r}_j - \vec{r}_i)}{(|\vec{r}_j - \vec{r}_i|^2 + \epsilon^2)^{3/2}}$$

- **Conservation Laws:**
  - Total Energy: $E = K + U = \frac{1}{2}\sum m_i |\vec{v}_i|^2 - G \sum_{i < j} \frac{m_i m_j}{|\vec{r}_j - \vec{r}_i|}$
  - Linear Momentum: $\vec{P} = \sum m_i \vec{v}_i = \text{const}$
  - Angular Momentum: $\vec{L} = \sum (\vec{r}_i \times m_i \vec{v}_i) = \text{const}$

---

## 👥 Team
- **Ram Vishwakarma**
- **Abhishek**
- **Mukul**

*IEHE Bhopal — Physics Model Project 2026*
