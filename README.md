# Three-Body Dynamics 🌌

**An observatory-grade 3D numerical simulation & chaos laboratory for the classical Three-Body Problem**

Built by **Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya** — B.Sc. Physics (Hons.), IEHE Bhopal | College Model Competition Project 2026

🌐 **Live Demo:** [https://three-body-dynamics.vercel.app](https://three-body-dynamics.vercel.app)  
📁 **Repository:** [https://github.com/StrangerLooter/three-body-dynamics](https://github.com/StrangerLooter/three-body-dynamics)

---

## 🌌 Overview

**Three-Body Dynamics** is a real-time, interactive, GPU-accelerated numerical simulator and physics laboratory. Built using Three.js and React 18, it couples high-accuracy numerical integrators (RK4, Velocity Verlet, Euler) with atmospheric Rayleigh scattering shaders, dynamic spacetime fabric curvature, Lagrange equilibrium solvers ($L_1–L_5$), procedural gravitational wave audio sonification, collision warning systems, and an AI physics tutor.

---

## 🚀 Key Features

| Domain | Features |
|---|---|
| **Photorealistic Visuals** | Atmospheric Rayleigh Fresnel glow shaders, 3D GLB celestial models (Sun, Earth, Mars), multi-temperature starfield, and cosmic dust nebulae. |
| **Trajectory Trails** | Real-time continuous 3D historical path tracking with independent color coding (Sun: Amber, Earth: Cyan, Mars: Coral-Red), smooth tail-to-head gradient, and zero-jump memory management. |
| **Dynamic Collision Warning HUD** | Real-time close encounter & collision alerts featuring screen-space occlusion avoidance, draggable positioning, and compact minimization mode so orbits remain visible. |
| **Physics Engine** | 4th-Order Runge-Kutta (RK4), symplectic Velocity Verlet, and Euler integrators with step-doubling adaptive time-stepping and Plummer singularity softening. |
| **Lagrange Equilibrium** | Real-time numerical calculation and 3D visualization of the 5 Lagrange equilibrium points ($L_1, L_2, L_3, L_4, L_5$). |
| **Spacetime Mesh** | 3D tension-colored fabric mesh dynamically warped according to the exact gravitational potential well $U(r)$ with zero-allocation math routines. |
| **Chaos Lab** | Real-time twin system perturbation ($A/B$), phase-space divergence tracking, and numerical Lyapunov exponent ($\lambda$) estimation. |
| **Gravitational Field** | Directional field lines, magnitude-encoded vector fields, potential well heatmap contours, and tracer particle flow. |
| **Gravitational Audio** | Procedural Web Audio API sonification of orbital acceleration, gravitational wave chirps on close approach, and deep-space drone. |
| **Phase Space Analysis** | 2D $(x, v_x)$ state-space attractor trajectories, energy/momentum conservation charts, and CSV/JSON data export. |
| **AI Physics Tutor** | Groq-powered assistant with live telemetry awareness, TTS voice narration, physics quizzes, and judge mode. |
| **Camera & Control** | 9 camera modes (Free Orbit, Follow Body 1–3, Follow COM, Orthographic Top/Front/Side, Auto Orbit), full hotkey suite. |

---

## 🔬 Mathematical & Physical Foundations

### 1. Newton's Law of Universal Gravitation (Softened)
Gravitational acceleration on body $i$ due to all bodies $j \neq i$:
$$\vec{a}_i = G \sum_{j \neq i} \frac{m_j (\vec{r}_j - \vec{r}_i)}{(|\vec{r}_j - \vec{r}_i|^2 + \epsilon^2)^{3/2}}$$
*Where $\epsilon = 0.05$ is the softening parameter preventing numerical infinities during near-zero periapsis passages.*

### 2. Conservation Laws (Monitored in Real Time)
- **Total Energy:**
  $$E = K + U = \frac{1}{2}\sum_{i=1}^3 m_i |\vec{v}_i|^2 - G \sum_{1 \le i < j \le 3} \frac{m_i m_j}{|\vec{r}_j - \vec{r}_i|}$$
- **Linear Momentum:**
  $$\vec{P} = \sum_{i=1}^3 m_i \vec{v}_i = \text{const}$$
- **Angular Momentum:**
  $$\vec{L} = \sum_{i=1}^3 (\vec{r}_i \times m_i \vec{v}_i) = \text{const}$$

### 3. Numerical Integrators
- **Runge-Kutta 4th Order (RK4):** Fourth-order accurate local truncation error $\mathcal{O}(\Delta t^5)$, global error $\mathcal{O}(\Delta t^4)$.
- **Velocity Verlet:** Second-order symplectic integrator that conserves phase space volume and long-term energy stability.
- **Euler Method:** Simple first-order integrator $\mathcal{O}(\Delta t)$ for comparative educational demonstrations.

### 4. Chaos Theory & Lyapunov Exponent
The sensitive dependence on initial conditions is quantified in real time by simulating an identical perturbed system $B$ alongside system $A$ with separation $\delta_0 = 10^{-5}$:
$$\lambda = \lim_{t \to \infty} \frac{1}{t} \ln \left( \frac{|\Delta \vec{r}(t)|}{|\Delta \vec{r}(0)|} \right)$$
A positive Lyapunov exponent ($\lambda > 0$) signifies deterministic chaos.

---

## ⚡ Performance Optimizations

1. **Zero-Allocation Physics Math:** High-vertex evaluations (such as the $28 \times 28$ spacetime fabric grid) utilize `computePotentialAtCoords(x, y, z)` to eliminate thousands of object allocations per frame.
2. **Ordered FIFO Trajectory Buffers:** Trajectories use TypedArray `copyWithin(0, 3)` to shift 1,200 points in-place, eliminating memory churn and visual jump seams.
3. **Adaptive Update Throttling:**
   - 3D Celestial rendering & orbits: native monitor refresh rate (60–144 Hz).
   - Spacetime fabric mesh: throttled to 30 Hz for optimal GPU/CPU balance.
   - SVG Telemetry & charts: throttled to 10 Hz to prevent DOM layout thrashing.
4. **WebGL Resolution Clamping:** Pixel ratio is clamped to `Math.min(window.devicePixelRatio, 2)` to guarantee consistent 60 FPS on high-DPI and Retina displays.

---

## 🛠️ Architecture & Folder Structure

```
three-body-dynamics/
├── index.html                # Application entry HTML with JetBrains Mono, Orbitron, and Montserrat fonts
├── package.json              # Dependencies and build scripts
├── vercel.json               # Vercel deployment configuration
├── vite.config.js            # Vite build configuration with chunk splitting
└── src/
    ├── App.jsx               # Master orchestrator component and simulation lifecycle
    ├── main.jsx              # React root mount
    ├── index.css             # Theme tokens, custom dark scrollbars, and glows
    ├── physics/              # Pure mathematical and physics algorithms
    │   ├── vectorMath.js     # 3D vector arithmetic (pure math, 0 dependencies)
    │   ├── gravity.js        # Newtonian mutual gravity, potential, and fields
    │   ├── integrators.js    # Euler, Velocity Verlet, RK4, step-doubling adaptive
    │   ├── conservation.js   # Energy, momentum, COM, and distance metrics
    │   ├── chaos.js          # Phase-space divergence and Lyapunov calculation
    │   ├── presets.js        # Figure-8, Solar System, Chaos, Lagrange configurations
    │   ├── lagrange.js       # Real-time L1-L5 Lagrange equilibrium point solver
    │   └── index.js          # Barrel export
    ├── constants/            # Physical constants and configuration
    │   ├── bodies.js         # Textures, models, colors, radius, spin rates, trail buffers
    │   ├── cameraModes.js    # 9 camera tracking modes
    │   ├── exportKeys.js     # Telemetry CSV/JSON headers
    │   ├── shortcuts.js      # Hotkey definitions
    │   └── index.js          # Barrel export
    ├── services/             # External integration and export services
    │   ├── aiService.js      # Groq API client with state snapshotting & NLP control
    │   ├── speechService.js  # Web Speech API text-to-speech synthesis
    │   ├── audioService.js   # Procedural Web Audio gravitational wave sonification
    │   └── exportService.js  # CSV/JSON file generation and canvas screenshots
    ├── hooks/                # Custom React hooks
    │   ├── useThreeSimulation.js   # Three.js scene, renderer, particle loop, controls
    │   └── useKeyboardShortcuts.js # Global hotkey listeners
    └── components/           # UI component layer
        ├── common/           # Buttons, numeric inputs, section layouts, toggles
        ├── hud/              # WarningCard, WarningNotificationManager
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
| `T` | Toggle Trajectory Trails |
| `V` | Toggle velocity vector arrows |
| `L` | Toggle Lagrange equilibrium points ($L_1–L_5$) |
| `M` | Toggle audio sonification & cosmic drone |
| `A` | Toggle analysis telemetry drawer |
| `?` | Toggle keyboard shortcuts overlay |
| `ESC` | Close active modals / drawers |

---

## 👥 Development Team

- **Ram Vishwakarma**
- **Parth Thakur**
- **Lucky Thorat**
- **Prabhas Kasanya**

*Department of Physics, Institute for Excellence in Higher Education (IEHE), Bhopal — 2026*
