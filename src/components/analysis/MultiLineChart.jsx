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

function buildSvgScatterPath(xVals, yVals, w, h, xMin, xMax, yMin, yMax) {
  const nv = Math.min(xVals.length, yVals.length);
  if (nv < 2) return '';
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  let d = '';
  for (let i = 0; i < nv; i++) {
    const x = ((xVals[i] - xMin) / xRange) * w;
    const y = h - ((yVals[i] - yMin) / yRange) * h;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d;
}

export function MultiLineChart({ series, tArr, isPhaseSpace = false }) {
  const width = 600;
  const height = 128;

  if (isPhaseSpace) {
    // 2D Phase Portrait (x vs vx)
    const allX = series.flatMap((s) => s.xValues || []).filter(Number.isFinite);
    const allY = series.flatMap((s) => s.yValues || []).filter(Number.isFinite);

    let xMin = allX.length ? Math.min(...allX) : -1;
    let xMax = allX.length ? Math.max(...allX) : 1;
    let yMin = allY.length ? Math.min(...allY) : -1;
    let yMax = allY.length ? Math.max(...allY) : 1;

    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }

    const xPad = (xMax - xMin) * 0.1;
    const yPad = (yMax - yMin) * 0.1;
    xMin -= xPad; xMax += xPad;
    yMin -= yPad; yMax += yPad;

    const xZero = ((0 - xMin) / (xMax - xMin)) * width;
    const yZero = height - ((0 - yMin) / (yMax - yMin)) * height;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full select-none"
        preserveAspectRatio="none"
      >
        {/* Crosshairs & Grid */}
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

        {xMin < 0 && xMax > 0 && (
          <line
            x1={xZero}
            x2={xZero}
            y1={0}
            y2={height}
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeDasharray="2 2"
          />
        )}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={0}
            x2={width}
            y1={yZero}
            y2={yZero}
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeDasharray="2 2"
          />
        )}

        {/* Phase Space Trajectory Attractor Paths */}
        {series.map((s) => (
          <path
            key={s.name}
            d={buildSvgScatterPath(s.xValues, s.yValues, width, height, xMin, xMax, yMin, yMax)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.4"
            opacity="0.85"
          />
        ))}

        {/* Axis Limits */}
        <text x={6} y={12} fill="#64748b" fontSize="9" fontFamily="monospace">
          Vx={yMax.toFixed(2)}
        </text>
        <text x={6} y={height - 4} fill="#64748b" fontSize="9" fontFamily="monospace">
          Vx={yMin.toFixed(2)}
        </text>
        <text x={width - 6} y={height - 4} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
          X={xMax.toFixed(2)}
        </text>
        <text x={6} y={height - 4} dx="52" fill="#64748b" fontSize="9" fontFamily="monospace">
          X={xMin.toFixed(2)}
        </text>
      </svg>
    );
  }

  // Time-Series Mode
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

      {series.map((s) => (
        <path
          key={s.name}
          d={buildSvgPath(s.values, width, height, min, max)}
          fill="none"
          stroke={s.color}
          strokeWidth="1.6"
        />
      ))}

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
