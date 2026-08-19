import { useEffect } from 'react';

export function useKeyboardShortcuts({
  enabled,
  onTogglePlay,
  onReset,
  onToggleTrails,
  onToggleVectors,
  onToggleLagrange,
  onToggleAudio,
  onCycleCamera,
  onFocusSelected,
  onToggleAnalysis,
  onToggleHelp,
  onCloseModals,
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay?.();
      } else if (e.key === 'r' || e.key === 'R') {
        onReset?.();
      } else if (e.key === 't' || e.key === 'T') {
        onToggleTrails?.();
      } else if (e.key === 'v' || e.key === 'V') {
        onToggleVectors?.();
      } else if (e.key === 'l' || e.key === 'L') {
        onToggleLagrange?.();
      } else if (e.key === 'm' || e.key === 'M') {
        onToggleAudio?.();
      } else if (e.key === 'c' || e.key === 'C') {
        onCycleCamera?.();
      } else if (e.key === 'f' || e.key === 'F') {
        onFocusSelected?.();
      } else if (e.key === 'a' || e.key === 'A') {
        onToggleAnalysis?.();
      } else if (e.key === '?') {
        onToggleHelp?.();
      } else if (e.key === 'Escape') {
        onCloseModals?.();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    enabled,
    onTogglePlay,
    onReset,
    onToggleTrails,
    onToggleVectors,
    onToggleLagrange,
    onToggleAudio,
    onCycleCamera,
    onFocusSelected,
    onToggleAnalysis,
    onToggleHelp,
    onCloseModals,
  ]);
}
