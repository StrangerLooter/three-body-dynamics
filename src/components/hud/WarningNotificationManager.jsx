import React from 'react';
import { WarningCard } from './WarningCard.jsx';

/**
 * Computes an optimal HUD position for a warning card that dynamically avoids
 * the screen-space region occupied by the colliding celestial bodies and their orbits.
 */
function getAvoidancePosition(warning, index) {
  const { screenX = 0.5, screenY = 0.5 } = warning;

  // Invert the quadrant: if planets are top-left, place card bottom-right
  const isEncounterTop = screenY < 0.5;
  const isEncounterLeft = screenX < 0.5;

  const stackOffset = index * 115; // Vertical offset for multiple cards

  if (isEncounterTop) {
    // Planets in upper half: anchor near bottom (clear of orbits and transport bar)
    const bottomPos = `${70 + stackOffset}px`;
    return isEncounterLeft
      ? { bottom: bottomPos, right: '4%' }
      : { bottom: bottomPos, left: '4%' };
  } else {
    // Planets in lower half: anchor near top (below status bar)
    const topPos = `${55 + stackOffset}px`;
    return isEncounterLeft
      ? { top: topPos, right: '4%' }
      : { top: topPos, left: '4%' };
  }
}

export function WarningNotificationManager({ warnings = [], onDismiss }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {warnings.slice(0, 3).map((w, idx) => {
        const pos = getAvoidancePosition(w, idx);
        return (
          <div
            key={w.id}
            className="absolute transition-all duration-500 ease-out pointer-events-auto"
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              right: pos.right,
              transform: 'scale(0.95)',
            }}
          >
            <WarningCard
              id={w.id}
              level={w.level}
              title={w.title}
              bodies={w.bodies}
              description={w.description}
              timestamp={w.timestamp}
              duration={w.duration || 8}
              onDismiss={onDismiss}
            />
          </div>
        );
      })}
    </div>
  );
}
