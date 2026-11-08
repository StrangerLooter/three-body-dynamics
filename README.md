# Three-Body Dynamics 🌌

**An observatory-grade 3D numerical simulation & chaos laboratory for the classical Three-Body Problem**

Built by **Ram Vishwakarma, Parth Thakur, Lucky Thorat, and Prabhas Kasanya**  
*Department of Physics, Institute for Excellence in Higher Education (IEHE), Bhopal | College Model Competition Project 2026*

🌐 **Live Production:** [https://three-body-dynamics.vercel.app](https://three-body-dynamics.vercel.app)  
📁 **GitHub Repository:** [https://github.com/StrangerLooter/three-body-dynamics](https://github.com/StrangerLooter/three-body-dynamics)

---

## 🌌 Overview

**Three-Body Dynamics** is a real-time, interactive, GPU-accelerated numerical simulator and astrophysics laboratory exploring Henri Poincaré's celebrated non-linear three-body problem. Powered by Three.js and React 18, the simulator couples high-precision numerical integrators (Runge-Kutta 4th Order, Symplectic Velocity Verlet, and Euler) with photorealistic 3D celestial rendering, dynamic spacetime curvature visualization, Lagrange equilibrium solvers ($L_1–L_5$), real-time Lyapunov exponent chaos estimation, Web Audio gravitational sonification, and a Groq-powered AI physics tutor.

Designed for physics students, educators, and astronomy enthusiasts, the simulation enables deep mathematical exploration of orbital resonances, deterministic chaos, and conservation laws in an intuitive, observatory-grade interface.

---

## 🚀 Key Features

| Domain | Detailed Description |
|---|---|
| **Photorealistic Visuals** | Ultra-optimized 3D GLB celestial models (**Sun**, **Jupiter**, **Mars**) featuring authentic PBR textures, atmospheric Fresnel glow shaders, and an astronomical pure white deep-space starfield. |
| **High-Contrast Celestial Models** | Swapped dark-space planetary bodies with a radiant, banded gas giant (**Jupiter** at $R = 0.17$), ensuring vibrant visibility against the deep cosmos without lighting occlusion. |
| **Trajectory Trails** | Real-time continuous 3D historical path tracking with independent color coding (Sun: Solar Amber `#ffbe40`, Jupiter: Banded Ochre `#e2b078`, Mars: Coral-Red `#ff5733`), smooth tail-to-head gradient, and zero-jump memory management. |
| **Ultra-Fast 3D Asset Loading** | All GLB models compressed by **~94%** down to a total payload of **~2.18 MB** across all bodies, loaded via parallel browser preloading and cached permanently with immutable HTTP headers. |
| **Dynamic Collision Warning HUD** | Real-time close encounter & collision alerts featuring screen-space occlusion avoidance, draggable positioning, and compact minimization mode so orbits remain visible. |
| **Physics Engine** | 4th-Order Runge-Kutta (RK4), symplectic Velocity Verlet, and Euler integrators with step-doubling adaptive time-stepping, pairwise symmetric force evaluation, and Plummer singularity softening. |
| **Lagrange Equilibrium** | Real-time numerical calculation and 3D visualization of the 5 Lagrange equilibrium points ($L_1, L_2, L_3, L_4, L_5$). |
| **Spacetime Mesh** | 3D tension-colored fabric mesh dynamically warped according to the exact gravitational potential well $U(\vec{r})$ with zero-allocation math routines. |
| **Chaos Lab** | Real-time twin system perturbation ($A/B$), phase-space divergence tracking, and numerical Lyapunov exponent ($\lambda$) estimation. |
| **Gravitational Field** | Directional field lines, magnitude-encoded vector fields, potential well heatmap contours, and tracer particle flow. |
| **Gravitational Audio** | Procedural Web Audio API sonification of orbital acceleration, gravitational wave chirps on close approach, and deep-space cosmic drone. |
| **Phase Space Analysis** | 2D $(x, v_x)$ state-space attractor trajectories, energy/momentum conservation charts, and CSV/JSON data export. |
| **AI Physics Tutor & Copilot** | Groq-powered assistant featuring **KaTeX LaTeX math typesetting**, responsive Markdown tables, **autonomous background simulation control via chat**, interactive action chips, live telemetry awareness, TTS voice narration, and physics quizzes. |
| **Orbit Presets & Choreographies** | Includes **Chenciner–Montgomery Figure-8**, **Lagrange Equilateral Triangle**, Solar Planetary System, Hierarchical Triple, Equal-Mass Chaos, and Restricted 3-Body regimes. |
| **Camera & Control** | 9 camera modes (Free Orbit, Follow Body 1–3, Follow COM, Orthographic Top/Front/Side, Auto Orbit), full hotkey suite. |

---

## 🔬 Mathematical & Physical Foundations

### 1. Newton's Law of Mutual Gravitation (Pairwise Symmetric)
The gravitational acceleration experienced by body $i$ due to all bodies $j \neq i$:
$$\vec{a}_i = G \sum_{j \neq i} \frac{m_j (\vec{r}_j - \vec{r}_i)}{(|\vec{r}_j - \vec{r}_i|^2 + \epsilon^2)^{3/2}}$$

To optimize computational throughput, the simulation implements Newton's Third Law ($\vec{F}_{ij} = -\vec{F}_{ji}$), reducing pairwise distance calculations from $N(N-1)$ to $\frac{N(N-1)}{2}$ (3 pairs instead of 6 evaluations per step).

*Where $\epsilon = 0.05$ is the Plummer softening parameter preventing mathematical infinities during near-zero periapsis passages.*

### 2. Numerical Integration Schemes

#### A. 4th-Order Runge-Kutta (RK4)
RK4 computes four intermediate slopes per time step to deliver a local truncation error of $\mathcal{O}(\Delta t^5)$ and global error of $\mathcal{O}(\Delta t^4)$:
$$\begin{aligned}
\vec{k}_1 &= f(t_n, \vec{y}_n) \\
\vec{k}_2 &= f\left(t_n + \frac{\Delta t}{2}, \vec{y}_n + \frac{\Delta t}{2}\vec{k}_1\right) \\
\vec{k}_3 &= f\left(t_n + \frac{\Delta t}{2}, \vec{y}_n + \frac{\Delta t}{2}\vec{k}_2\right) \\
\vec{k}_4 &= f(t_n + \Delta t, \vec{y}_n + \Delta t\,\vec{k}_3) \\
\vec{y}_{n+1} &= \vec{y}_n + \frac{\Delta t}{6} (\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4)
\end{aligned}$$

#### B. Symplectic Velocity Verlet
Essential for long-term orbital simulations because it is time-reversible and preserves phase-space volume (symplectic property):
$$\begin{aligned}
\vec{r}_{n+1} &= \vec{r}_n + \vec{v}_n \Delta t + \frac{1}{2} \vec{a}_n \Delta t^2 \\
\vec{a}_{n+1} &= \vec{a}(\vec{r}_{n+1}) \\
\vec{v}_{n+1} &= \vec{v}_n + \frac{1}{2} (\vec{a}_n + \vec{a}_{n+1}) \Delta t
\end{aligned}$$

### 3. Conservation Laws (Monitored in Real Time)
- **Total Mechanical Energy:**
  $$E = K + U = \frac{1}{2}\sum_{i=1}^3 m_i |\vec{v}_i|^2 - G \sum_{1 \le i < j \le 3} \frac{m_i m_j}{\sqrt{|\vec{r}_j - \vec{r}_i|^2 + \epsilon^2}}$$
- **Linear Momentum:**
  $$\vec{P} = \sum_{i=1}^3 m_i \vec{v}_i = \text{const}$$
- **Total Angular Momentum:**
  $$\vec{L} = \sum_{i=1}^3 (\vec{r}_i \times m_i \vec{v}_i) = \text{const}$$

### 4. Deterministic Chaos & Lyapunov Exponent ($\lambda$)
In the Chaos Lab, an identical perturbed twin system $B$ is evolved synchronously with state separation $\delta_0 = 10^{-6}$:
$$\lambda \approx \frac{1}{t - t_0} \ln\left( \frac{\|\Delta \vec{r}(t)\|}{\|\Delta \vec{r}(0)\|} \right)$$
A strictly positive Lyapunov exponent ($\lambda > 0$) demonstrates the exponential divergence of trajectories characteristic of deterministic chaos.

### 5. Stable Periodic Choreographies

#### A. Chenciner–Montgomery Figure-Eight Orbit (2000)
A celebrated zero-angular-momentum ($\mathbf{L} = \mathbf{0}$) choreography where three equal masses trace a single planar figure-8 path.
- **Linear Stability (Carles Simó, 2002):** Proved linearly stable—all Floquet multipliers of the linearized Poincaré map lie strictly on the unit circle ($|\lambda_i| = 1$).
- **Phase-Space KAM Tori:** Bounded by invariant Kolmogorov-Arnold-Moser tori, conferring long-term quasi-periodic stability against small perturbations.

#### B. Lagrange's Equilateral Triangle Choreography (1772)
Three equal masses placed at the vertices of an equilateral triangle rotating uniformly around their barycenter with speed $v = \sqrt{Gm/L}$.
- **Gascheau Stability Condition:** In the rotating frame, triangular equilibria remain linearly stable when:
  $$\frac{m_1 m_2 + m_2 m_3 + m_3 m_1}{(m_1 + m_2 + m_3)^2} < \frac{1}{27} \approx 0.037037$$

---

## 🤖 Next-Gen Physics Copilot Architecture

The integrated AI Copilot workstation features:
* **Minimalist UI & Zero Clutter:** Clean, distraction-free conversational experience with secondary tools, live telemetry, and 10 specialized physics modes tucked into a collapsible bottom accessory drawer.
* **KaTeX LaTeX & Markdown Tables:** Native KaTeX formula typesetting ($...$ and $$...$$) and responsive, sticky-header Markdown tables for all coordinates, masses, and velocities.
* **Background Simulation Control via Chat:** Type natural language commands such as `"set triangle and run"`, `"run"`, `"pause"`, `"reset"`, or click embedded interactive action chips (`[🔺 Set Triangle & Run]`, `[🌀 Set Figure-8 & Run]`) to manipulate the 3D physics engine instantly.
* **20 Performance Optimizations:** In-memory LRU semantic caching (0ms response time for static queries), telemetry prompt compression from ~450 to ~90 tokens, numerical quantization, rate-limit retry with backoff, `React.memo` component memoization, and user-aware smart autoscroll.

---

## ⚡ Performance & Asset Architecture

### 1. 3D GLB Optimization Pipeline
The celestial 3D models were converted and packed with 4-byte binary chunk alignments:
* **Sun (`sun.glb`)**: 566 KB (73% size reduction) with solar emissive maps.
* **Jupiter (`realistic_jupiter.glb`)**: 867 KB, high-contrast PBR banded atmospheric textures that remain brightly visible in pitch-black space.
* **Mars (`mars.glb`)**: 749 KB (94.5% size reduction) with 1K optimized normal, roughness, and specular maps.
* **Total Combined 3D Payload**: **2.18 MB** (down from initial ~34 MB).

### 2. Network Delivery & Browser Caching
* **Parallel Preload Hints**: `<link rel="preload" as="fetch" crossorigin="anonymous">` in `index.html` initiates parallel background asset downloads before script execution.
* **Immutable Caching**: Vercel configuration serves models with `Cache-Control: public, max-age=31536000, immutable`, enabling 0ms subsequent loads from disk cache.
* **In-Memory Promise Cache**: `getCachedGLTF()` ensures subsequent preset switches or resets resolve instantly without repeated parsing.

### 3. Deep-Space Pure White Starfield
* Replaced irregular colored and orange particle clusters with a layered 4-tier astronomical starfield ($N = 5,700$ stars) rendered in pure crisp white (`0xffffff`) with natural depth attenuation.
* Replaced distracting colored nebula particles with subtle, faint silver cosmic stardust (`size: 0.9, opacity: 0.12`).

### 4. Zero-Allocation Numerical Routines
* `computeAccelerations` utilizes scalar loop variables without intermediate object allocations.
* `computeSeparation` directly computes Euclidean coordinate distances without array allocations, eliminating garbage collector pauses during 60–144 FPS simulations.

---

## 🛠️ Project Structure

```
three-body-dynamics/
├── index.html                # Application entry HTML with GLB preload hints & fonts
├── package.json              # Dependencies and build scripts
├── vercel.json               # Vercel deployment with immutable Cache-Control headers
├── vite.config.js            # Vite build configuration with chunk splitting
├── scripts/
│   ├── optimize-models.py    # Python GLB texture compression & repacking utility
│   └── test-physics-integrity.js  # Automated physics unit test suite
├── public/
│   ├── images/               # Textures and landing page imagery
│   └── models/               # Optimized 3D GLB files (sun.glb, realistic_jupiter.glb, mars.glb)
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

## 🧪 Testing & Verification

The repository includes an automated mathematical and physics integrity test suite:

```bash
npm test
```

### Verified Test Cases:
1. **Vector Math Integrity**: Verification of 3D vector addition, subtraction, scaling, dot products, and right-hand rule cross products.
2. **Gravitational Potential Math**: Zero-allocation coordinate scalar potential computation matches vector-based formulations within $10^{-12}$.
3. **Conservation of Energy in RK4**: Validates energy conservation over 100 simulation steps of the Chenciner–Montgomery Figure-8 orbit with relative error $< 10^{-4}$.
4. **Symplectic Momentum Conservation**: Velocity Verlet conservation of linear and angular momentum within $10^{-6}$.
5. **Lagrange Solver Verification**: Solves all five collinear and equilateral equilibrium points ($L_1–L_5$) with finite coordinates.
6. **Orbital Presets Completeness**: Validates physical validity of initial velocities, masses, and coordinates across all preset systems.

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
| `C` | Cycle through 9 camera modes |
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
