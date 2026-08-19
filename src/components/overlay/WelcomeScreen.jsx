import React from 'react';

export function WelcomeScreen({ onEnter }) {
  return (
    <div className="w-full h-full min-h-[600px] bg-[#02040a] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden font-mono">
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(111,211,255,0.12), transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
        <div className="text-[11px] tracking-[0.4em] text-cyan-300/80 mb-3 uppercase font-medium">
          RK4 · Chaos Lab · Field Visualization
        </div>
        <h1 className="text-3xl md:text-5xl font-light text-slate-100 tracking-wider mb-2 drop-shadow-[0_0_25px_rgba(111,211,255,0.3)]">
          THREE-BODY DYNAMICS
        </h1>
        <p className="text-slate-400 text-xs tracking-widest uppercase mb-4 font-normal">
          Built by <span className="text-slate-200 font-medium">Ram Vishwakarma, Abhishek & Mukul</span>
        </p>
        <p className="text-slate-400 text-xs md:text-sm max-w-md mx-auto mb-8 font-light leading-relaxed">
          A high-precision 3D numerical laboratory for classical gravitational dynamics, chaotic sensitivity, and spacetime curvature.
        </p>

        <button
          onClick={onEnter}
          className="group relative px-8 py-3 border border-cyan-400/50 text-cyan-200 tracking-[0.25em] text-xs font-mono bg-cyan-950/20 hover:bg-cyan-400/15 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(111,211,255,0.35)] transition-all duration-300 cursor-pointer"
        >
          <span className="relative z-10">ENTER SIMULATION</span>
          <div className="absolute inset-0 bg-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="mt-8 flex items-center gap-4 text-[10px] tracking-[0.3em] text-slate-500">
          <span>RK4 & VERLET</span>
          <span>•</span>
          <span>3D ORBITS</span>
          <span>•</span>
          <span>AI TUTOR</span>
        </div>
      </div>
    </div>
  );
}
