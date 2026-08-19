import { useEffect } from 'react';

export function useKeyboardShortcuts({
  enabled,
  onTogglePlay,
  onReset,
  onToggleTrails,
  onToggleVectors,
  onCycleCamera,
  onFocusSelected,
  onToggleAnalysis,
  onToggleHelp,
  onCloseModals,
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e) => {
      // Ignore if user is currently typing in an input, textarea or select
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
    onCycleCamera,
    onFocusSelected,
    onToggleAnalysis,
    onToggleHelp,
    onCloseModals,
  ]);
}
