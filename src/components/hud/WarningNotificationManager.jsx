import React from 'react';
import { WarningCard } from './WarningCard.jsx';

// Predefined safe viewport quadrant positions (around the center / offset corners)
const QUADRANT_POSITIONS = [
  { top: '14%', left: '32%' },   // Top-Center
  { top: '22%', right: '18%' },  // Top-Right
  { bottom: '24%', left: '22%' },// Bottom-Left
  { bottom: '26%', right: '24%' },// Bottom-Right
];

export function WarningNotificationManager({ warnings = [], onDismiss }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {warnings.slice(0, 3).map((w, idx) => {
        const pos = QUADRANT_POSITIONS[w.slotIndex % QUADRANT_POSITIONS.length] || QUADRANT_POSITIONS[idx % QUADRANT_POSITIONS.length];
        return (
          <div
            key={w.id}
            className="absolute transition-all duration-300 pointer-events-auto"
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
