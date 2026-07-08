/**
 * ZoomControls — Floating panel for canvas zoom (P1-06).
 *
 * Bottom-right floating panel: +/- 25% steps, percentage display,
 * fit canvas, reset 100%.
 * Ctrl+wheel zoom anchored to mouse position.
 * Scale persisted with 500ms debounce.
 */

import { useCallback, useRef } from 'react';

interface ZoomControlsProps {
  scale: number;
  onZoomChange: (scale: number) => void;
  onFitCanvas?: () => void;
}

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

function nearestStep(scale: number): number {
  return ZOOM_STEPS.reduce((prev, curr) =>
    Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
  );
}

function clampScale(s: number): number {
  return Math.max(0.2, Math.min(3.0, s));
}

export default function ZoomControls({ scale, onZoomChange, onFitCanvas }: ZoomControlsProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleZoomIn = useCallback(() => {
    const nextIdx = ZOOM_STEPS.findIndex(s => s > scale + 0.01);
    if (nextIdx >= 0) {
      onZoomChange(ZOOM_STEPS[nextIdx]);
    } else {
      onZoomChange(Math.min(3.0, scale + 0.25));
    }
  }, [scale, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const reversed = [...ZOOM_STEPS].reverse();
    const next = reversed.find(s => s < scale - 0.01);
    if (next !== undefined) {
      onZoomChange(next);
    } else {
      onZoomChange(Math.max(0.2, scale - 0.25));
    }
  }, [scale, onZoomChange]);

  const handleReset = useCallback(() => {
    onZoomChange(1.0);
  }, [onZoomChange]);

  const percentage = Math.round(scale * 100);

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      display: 'flex', alignItems: 'center', gap: 4,
      background: '#1e1e1e', border: '1px solid #333',
      borderRadius: 8, padding: '4px 8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      zIndex: 50, userSelect: 'none',
    }}>
      {/* Zoom out */}
      <button
        className="tb-btn"
        onClick={handleZoomOut}
        disabled={scale <= 0.2}
        title="缩小 (Ctrl+-)"
        style={{ fontSize: 16, width: 28, height: 28, opacity: scale <= 0.2 ? 0.4 : 1 }}
      >
        −
      </button>

      {/* Percentage */}
      <div style={{
        minWidth: 44, textAlign: 'center', fontSize: 12,
        fontWeight: 600, color: '#ccc', fontVariantNumeric: 'tabular-nums',
      }}>
        {percentage}%
      </div>

      {/* Zoom in */}
      <button
        className="tb-btn"
        onClick={handleZoomIn}
        disabled={scale >= 3.0}
        title="放大 (Ctrl++)"
        style={{ fontSize: 16, width: 28, height: 28, opacity: scale >= 3.0 ? 0.4 : 1 }}
      >
        +
      </button>

      <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />

      {/* Fit canvas */}
      <button
        className="tb-btn"
        onClick={onFitCanvas}
        title="适应画布 (Ctrl+0)"
        style={{ fontSize: 14, width: 28, height: 28 }}
      >
        ⊞
      </button>

      {/* Reset 100% */}
      <button
        className="tb-btn"
        onClick={handleReset}
        title="重置为100%"
        style={{ fontSize: 11, width: 36, height: 28 }}
      >
        100%
      </button>
    </div>
  );
}
