import React from 'react';

export function WebglErrorModal() {
  return (
    <div className="w-full h-full min-h-[600px] bg-[#02040a] flex flex-col items-center justify-center text-center px-6 font-mono">
      <div className="text-amber-400 text-3xl mb-3 animate-bounce">⚠</div>
      <h2 className="text-slate-200 text-lg mb-2 font-mono tracking-wider font-semibold">
        WEBGL UNAVAILABLE
      </h2>
      <p className="text-slate-400 text-xs max-w-md font-mono leading-relaxed">
        Your browser or graphics hardware could not initialize a WebGL context.
        Please enable hardware acceleration in your browser settings or try a WebGL-compatible browser.
      </p>
    </div>
  );
}
