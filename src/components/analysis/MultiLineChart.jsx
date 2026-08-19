import React from 'react';

function buildSvgPath(values, w, h, min, max) {
  const nv = values.length;
  if (nv < 2) return '';
  const range = max - min || 1;
  let d = '';
  for (let i = 0; i < nv; i++) {
    const x = (i / (nv - 1)) * w;
    const y = h - ((values[i] - min) / range) * h;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

export function MultiLineChart({ series, tArr }) {
  const width = 600;
  const height = 128;
  const allVals = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  let min = allVals.length ? Math.min(...allVals) : 0;
  let max = allVals.length ? Math.max(...allVals) : 1;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  const tMin = tArr && tArr.length ? tArr[0] : 0;
  const tMax = tArr && tArr.length ? tArr[tArr.length - 1] : 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full select-none"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={f * height}
          y2={f * height}
          stroke="#ffffff"
          strokeOpacity="0.06"
        />
      ))}

      {/* Zero line if crossed */}
      {min < 0 && max > 0 && (
        <line
          x1={0}
          x2={width}
          y1={height - ((0 - min) / (max - min)) * height}
          y2={height - ((0 - min) / (max - min)) * height}
          stroke="#ffffff"
          strokeOpacity="0.2"
          strokeDasharray="3 3"
        />
      )}

      {/* Paths */}
      {series.map((s) => (
        <path
          key={s.name}
          d={buildSvgPath(s.values, width, height, min, max)}
          fill="none"
          stroke={s.color}
          strokeWidth="1.6"
        />
      ))}

      {/* Numerical Axis labels */}
      <text x={6} y={12} fill="#64748b" fontSize="9" fontFamily="monospace">
        {max.toExponential(2)}
      </text>
      <text x={6} y={height - 4} fill="#64748b" fontSize="9" fontFamily="monospace">
        {min.toExponential(2)}
      </text>
      <text
        x={width - 6}
        y={height - 4}
        fill="#64748b"
        fontSize="9"
        fontFamily="monospace"
        textAnchor="end"
      >
        T={Number(tMax).toFixed(1)}s
      </text>
      <text x={6} y={height - 4} dx="52" fill="#64748b" fontSize="9" fontFamily="monospace">
        T={Number(tMin).toFixed(1)}s
      </text>
    </svg>
  );
}
