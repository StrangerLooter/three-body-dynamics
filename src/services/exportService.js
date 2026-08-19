import { EXPORT_KEYS } from '../constants/exportKeys.js';

export function buildExportCSV(H) {
  const n = H.t ? H.t.length : 0;
  const lines = [EXPORT_KEYS.join(',')];
  for (let i = 0; i < n; i++) {
    lines.push(
      EXPORT_KEYS.map((k) => (H[k] && H[k][i] !== undefined ? H[k][i] : '')).join(',')
    );
  }
  return lines.join('\n');
}

export function buildExportJSON(H) {
  const n = H.t ? H.t.length : 0;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = {};
    EXPORT_KEYS.forEach((k) => {
      row[k] = H[k] ? H[k][i] : null;
    });
    rows.push(row);
  }
  return JSON.stringify(rows, null, 2);
}

export function downloadTextFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function captureCanvasScreenshot(renderer, filename = `three-body-dynamics-${Date.now()}.png`) {
  if (!renderer) return;
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
