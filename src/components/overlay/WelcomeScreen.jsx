import React, { useEffect } from 'react';
import dynamicsNebula from '../../assets/dynamics-nebula.png';

export function WelcomeScreen({ onEnter }) {
  // Support Enter or Space key to launch simulation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is focusing an input or link
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter]);

  return (
    <div className="w-full h-screen min-h-screen bg-black flex flex-col justify-between items-center text-center px-4 sm:px-8 py-6 relative overflow-hidden select-none font-mono">
      {/* Background ambient lighting - Deep cosmic glow matching the hero title */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 48%, rgba(13, 30, 60, 0.45) 0%, rgba(20, 10, 45, 0.25) 40%, rgba(0, 0, 0, 0.95) 75%, #000000 100%)',
        }}
      />

      {/* Subtle cosmic particles / stars overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 15% 25%, #ffffff, transparent), radial-gradient(1.5px 1.5px at 75% 15%, #38bdf8, transparent), radial-gradient(1px 1px at 85% 70%, #ffffff, transparent), radial-gradient(1px 1px at 30% 80%, #a855f7, transparent), radial-gradient(1.5px 1.5px at 50% 10%, #ffffff, transparent), radial-gradient(1px 1px at 65% 55%, #f97316, transparent), radial-gradient(1px 1px at 20% 65%, #38bdf8, transparent)',
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP NAVBAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between z-20 pt-1">
        {/* Left: Swirling Vortex Logo + Title */}
        <div className="flex items-center gap-3.5 group cursor-default">
          <div className="relative w-9 h-9 flex items-center justify-center">
            {/* Pulsing neon cyan glow behind logo */}
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-md group-hover:bg-cyan-400/40 transition-all duration-300" />
            <svg
              className="w-8 h-8 text-cyan-400 relative z-10 transition-transform duration-700 group-hover:rotate-180"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Swirling celestial vortex arms */}
              <circle cx="50" cy="50" r="5" fill="#22d3ee" />
              <path
                d="M50 15 C68 15 82 28 85 45 C86 52 82 56 76 54 C68 51 64 42 58 35 C52 28 42 28 35 32 C28 36 24 45 25 54 C26 68 37 80 50 85 C65 91 80 84 86 72"
                stroke="#22d3ee"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M50 85 C32 85 18 72 15 55 C14 48 18 44 24 46 C32 49 36 58 42 65 C48 72 58 72 65 68 C72 64 76 55 75 46 C74 32 63 20 50 15"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M20 35 C28 22 45 15 62 18 C78 21 88 35 88 50 C88 65 76 78 60 82"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 6"
                opacity="0.7"
              />
            </svg>
          </div>
          <span className="text-white text-xs sm:text-sm font-semibold tracking-[0.24em] uppercase font-mono">
            THREE-BODY DYNAMICS
          </span>
        </div>

        {/* Right: GitHub Button + Launch Simulation Button */}
        <div className="flex items-center gap-3">
          {/* GitHub Button */}
          <a
            href="https://github.com/StrangerLooter/three-body-dynamics"
            target="_blank"
            rel="noopener noreferrer"
            id="nav-github-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0c1017] hover:bg-[#161b22] text-white border border-white/20 hover:border-white/40 text-xs sm:text-sm font-sans font-medium transition-all duration-200 shadow-sm cursor-pointer"
          >
            {/* GitHub Octocat Icon */}
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>

          {/* Launch Simulation Button */}
          <button
            onClick={onEnter}
            id="nav-launch-btn"
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#00d2ff] hover:bg-[#38bdf8] text-black font-semibold text-xs sm:text-sm shadow-[0_0_20px_rgba(0,210,255,0.7)] hover:shadow-[0_0_30px_rgba(0,210,255,0.95)] active:scale-95 transition-all duration-200 cursor-pointer font-sans"
          >
            <span>Launch Simulation</span>
            <span className="text-sm font-bold">→</span>
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. HERO CENTER CONTENT */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center flex-1 z-10 max-w-4xl mx-auto my-auto py-8">
        {/* Sub-header tagline */}
        <div className="text-[11px] sm:text-xs tracking-[0.42em] text-slate-300 uppercase font-mono font-medium mb-4 sm:mb-6">
          EXPLORE &nbsp;·&nbsp; SIMULATE &nbsp;·&nbsp; LEARN &nbsp;·&nbsp; DISCOVER
        </div>

        {/* Title: Huge, Bold Orbitron Black Typography */}
        <div className="flex flex-col items-center justify-center mb-6">
          {/* Top Line: THREE-BODY */}
          <h1 className="font-orbitron font-black text-5xl sm:text-7xl md:text-8xl lg:text-[98px] tracking-wider text-white leading-none drop-shadow-[0_4px_30px_rgba(255,255,255,0.3)] select-none">
            THREE-BODY
          </h1>

          {/* Bottom Line: DYNAMICS (Nebula Image Background) */}
          <div
            className="font-orbitron font-black text-5xl sm:text-7xl md:text-8xl lg:text-[98px] tracking-wider leading-none mt-1 sm:mt-2 select-none"
            style={{
              backgroundImage: `url(${dynamicsNebula})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              filter: 'drop-shadow(0 0 35px rgba(121, 40, 202, 0.5)) drop-shadow(0 0 20px rgba(0, 210, 255, 0.4))',
            }}
          >
            DYNAMICS
          </div>
        </div>

        {/* Description Paragraph */}
        <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-xl mx-auto mb-9 font-light leading-relaxed tracking-wide px-4">
          A high-precision 3D numerical laboratory for classical gravitational dynamics,
          <br className="hidden sm:inline" /> chaotic sensitivity, and spacetime curvature.
        </p>

        {/* Big Center CTA Button: ENTER SIMULATION */}
        <div className="relative group cursor-pointer" onClick={onEnter}>
          {/* Outer glowing border gradient wrapper */}
          <div
            className="p-[1.5px] rounded-full transition-all duration-300 group-hover:scale-105"
            style={{
              background:
                'linear-gradient(90deg, #00d2ff 0%, #38bdf8 30%, #a855f7 70%, #ec4899 100%)',
              boxShadow:
                '0 0 25px rgba(0, 210, 255, 0.4), 0 0 45px rgba(168, 85, 247, 0.35)',
            }}
          >
            {/* Inner Pill Body */}
            <div className="flex items-center gap-3.5 pl-2 pr-6 py-2 rounded-full bg-[#050914] transition-colors group-hover:bg-[#080e1e]">
              {/* Left: Glowing Play Button */}
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #00d2ff 0%, #38bdf8 100%)',
                  boxShadow: '0 0 18px rgba(0, 210, 255, 0.8)',
                }}
              >
                {/* Play Triangle SVG */}
                <svg
                  className="w-4 h-4 fill-white ml-0.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              {/* Center Text */}
              <span className="text-white font-mono font-bold text-xs sm:text-sm tracking-[0.24em] uppercase">
                ENTER SIMULATION
              </span>

              {/* Right Arrow */}
              <span className="text-slate-300 font-mono text-base transition-transform group-hover:translate-x-1.5 duration-200">
                →
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FOOTER: BUILT BY & TEAM MEMBERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col items-center z-20 pb-2">
        {/* Divider with "BUILT BY" in the center */}
        <div className="flex items-center justify-center gap-4 w-full max-w-md mb-3">
          <div
            className="h-[1px] flex-1"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.4) 60%, rgba(6, 182, 212, 0.8) 100%)',
            }}
          />
          <span className="text-[11px] tracking-[0.35em] text-slate-300 uppercase font-mono font-semibold">
            BUILT BY
          </span>
          <div
            className="h-[1px] flex-1"
            style={{
              background:
                'linear-gradient(90deg, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.4) 40%, transparent 100%)',
            }}
          />
        </div>

        {/* Team Members List */}
        <div className="text-[11px] sm:text-xs tracking-[0.25em] text-slate-400 uppercase font-mono font-medium flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
          <span className="hover:text-cyan-300 transition-colors">RAM VISHWAKARMA</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-cyan-300 transition-colors">PARTH THAKUR</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-cyan-300 transition-colors">LUCKY THORAT</span>
          <span className="text-slate-600">•</span>
          <span className="hover:text-cyan-300 transition-colors">PRABHAS KASANYA</span>
        </div>
      </footer>
    </div>
  );
}
