import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  SimulationTimePoint,
  SimulationConfig,
} from '../../types/circuit';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eye,
  EyeOff,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface TraceConfig {
  id: string;
  name: string;
  unit: string;
  color: string;
  visible: boolean;
  scaleY: number; // multiplier for display
  offsetY: number; // offset in volts/amps
}

interface OscilloscopeViewerProps {
  config: SimulationConfig;
  points: SimulationTimePoint[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (spd: number) => void;
}

export const OscilloscopeViewer: React.FC<OscilloscopeViewerProps> = ({
  points,
  currentIndex,
  onSelectIndex,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trace toggles
  const [traces, setTraces] = useState<Record<string, TraceConfig>>({
    vs: { id: 'vs', name: 'vs(t) Supply Voltage', unit: 'V', color: '#06b6d4', visible: true, scaleY: 1, offsetY: 0 },
    vo: { id: 'vo', name: 'vo(t) Output Voltage', unit: 'V', color: '#f59e0b', visible: true, scaleY: 1, offsetY: 0 },
    io: { id: 'io', name: 'io(t) Load Current', unit: 'A', color: '#10b981', visible: true, scaleY: 10, offsetY: 0 }, // Scaled for display visibility
    is: { id: 'is', name: 'is(t) Source Current', unit: 'A', color: '#ec4899', visible: false, scaleY: 10, offsetY: 0 },
    vg: { id: 'vg', name: 'vg(t) Gate Pulses', unit: 'V', color: '#8b5cf6', visible: false, scaleY: 20, offsetY: 0 },
    ifwd: { id: 'ifwd', name: 'i_fwd(t) FWD Current', unit: 'A', color: '#f97316', visible: false, scaleY: 10, offsetY: 0 },
  });

  // Cursor measurements
  const [showCursors, setShowCursors] = useState(false);
  const [cursorAIndex, setCursorAIndex] = useState(Math.floor(points.length * 0.25));
  const [cursorBIndex, setCursorBIndex] = useState(Math.floor(points.length * 0.75));
  const [activeDragging, setActiveDragging] = useState<'time' | 'cursorA' | 'cursorB' | null>(null);

  // Zoom & Pan
  const [timeZoom, setTimeZoom] = useState(1); // 1 = 100% full view
  const [timeOffset, setTimeOffset] = useState(0);

  const toggleTrace = (id: string) => {
    setTraces((prev) => ({
      ...prev,
      [id]: { ...prev[id], visible: !prev[id].visible },
    }));
  };

  const currentPt = points[currentIndex] || points[0];
  const ptA = points[cursorAIndex] || points[0];
  const ptB = points[cursorBIndex] || points[0];

  const deltaT = Math.abs((ptB?.time || 0) - (ptA?.time || 0));
  const freqEquivalent = deltaT > 1e-6 ? 1 / deltaT : 0;
  const deltaVo = Math.abs((ptB?.vo || 0) - (ptA?.vo || 0));

  // Render Canvas Oscilloscope Display
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Draw Background (Cathode Ray / Phosphor dark slate)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Oscilloscope Graticule (10 horizontal x 8 vertical divisions)
    const numDivsX = 10;
    const numDivsY = 8;
    const divWidth = width / numDivsX;
    const divHeight = height / numDivsY;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Major grid lines
    for (let x = 0; x <= numDivsX; x++) {
      ctx.beginPath();
      ctx.moveTo(x * divWidth, 0);
      ctx.lineTo(x * divWidth, height);
      ctx.stroke();
    }
    for (let y = 0; y <= numDivsY; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * divHeight);
      ctx.lineTo(width, y * divHeight);
      ctx.stroke();
    }

    // Center Crosshair major axes
    const midX = width / 2;
    const midY = height / 2;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, height);
    ctx.stroke();

    // Minor tick marks along center crosshair
    const subTicks = 5;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let x = 0; x <= numDivsX; x++) {
      for (let s = 1; s < subTicks; s++) {
        const tx = x * divWidth + (s * divWidth) / subTicks;
        ctx.beginPath();
        ctx.moveTo(tx, midY - 3);
        ctx.lineTo(tx, midY + 3);
        ctx.stroke();
      }
    }
    for (let y = 0; y <= numDivsY; y++) {
      for (let s = 1; s < subTicks; s++) {
        const ty = y * divHeight + (s * divHeight) / subTicks;
        ctx.beginPath();
        ctx.moveTo(midX - 3, ty);
        ctx.lineTo(midX + 3, ty);
        ctx.stroke();
      }
    }

    // 3. Find Global Peak for Auto-Scaling Y
    let maxV = 100;
    for (let i = 0; i < points.length; i += 10) {
      if (Math.abs(points[i].vs) > maxV) maxV = Math.abs(points[i].vs);
      if (Math.abs(points[i].vo) > maxV) maxV = Math.abs(points[i].vo);
    }
    maxV *= 1.25; // 25% headroom

    const yCenter = midY;
    const yScale = (height / 2 - 20) / maxV;

    // Helper: Map time index to X coordinate
    const totalPoints = points.length;
    const mapIndexToX = (idx: number) => {
      const norm = idx / (totalPoints - 1);
      const zoomedNorm = (norm - timeOffset) * timeZoom;
      return zoomedNorm * width;
    };

    // 4. Plot Active Traces
    const plotTrace = (
      valAccessor: (p: SimulationTimePoint) => number,
      color: string,
      scaleMultiplier: number
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      let started = false;
      for (let i = 0; i < totalPoints; i++) {
        const x = mapIndexToX(i);
        if (x < -10 || x > width + 10) continue;

        const val = valAccessor(points[i]) * scaleMultiplier;
        const y = yCenter - val * yScale;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Draw traces in priority order
    if (traces.vs.visible) plotTrace((p) => p.vs, traces.vs.color, 1);
    if (traces.vo.visible) plotTrace((p) => p.vo, traces.vo.color, 1);
    if (traces.io.visible) plotTrace((p) => p.io, traces.io.color, traces.io.scaleY);
    if (traces.is.visible) plotTrace((p) => p.is, traces.is.color, traces.is.scaleY);
    if (traces.vg.visible) plotTrace((p) => p.vGate, traces.vg.color, traces.vg.scaleY);
    if (traces.ifwd.visible) plotTrace((p) => p.iFwd, traces.ifwd.color, traces.ifwd.scaleY);

    // 5. Draw Zero Reference Line (GND)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, yCenter);
    ctx.lineTo(width, yCenter);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0V GND', 8, yCenter - 4);

    // 6. Draw Measurement Cursors if enabled
    if (showCursors) {
      // Cursor A (Dashed Amber line)
      const xA = mapIndexToX(cursorAIndex);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(xA, 0);
      ctx.lineTo(xA, height);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('Cursor A', xA + 4, 18);
      ctx.fillText(`t = ${(ptA?.time * 1000).toFixed(2)}ms`, xA + 4, 30);

      // Cursor B (Dashed Cyan line)
      const xB = mapIndexToX(cursorBIndex);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xB, 0);
      ctx.lineTo(xB, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#06b6d4';
      ctx.fillText('Cursor B', xB + 4, 18);
      ctx.fillText(`t = ${(ptB?.time * 1000).toFixed(2)}ms`, xB + 4, 30);
    }

    // 7. Draw Time Marker Cursor (Current Animation Position)
    const xCur = mapIndexToX(currentIndex);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xCur, 0);
    ctx.lineTo(xCur, height);
    ctx.stroke();

    // Diamond pointer at top
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(xCur, 0);
    ctx.lineTo(xCur - 6, 10);
    ctx.lineTo(xCur + 6, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, [
    points,
    currentIndex,
    cursorAIndex,
    cursorBIndex,
    showCursors,
    traces,
    timeZoom,
    timeOffset,
    ptA,
    ptB,
  ]);

  // Redraw on state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Canvas Mouse Interactions (Dragging Time Cursor or Measurement Cursors)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const normX = clickX / rect.width;
    const targetIdx = Math.round(normX * (points.length - 1));

    if (showCursors) {
      const distA = Math.abs(clickX - (cursorAIndex / (points.length - 1)) * rect.width);
      const distB = Math.abs(clickX - (cursorBIndex / (points.length - 1)) * rect.width);
      if (distA < 15) {
        setActiveDragging('cursorA');
        return;
      }
      if (distB < 15) {
        setActiveDragging('cursorB');
        return;
      }
    }

    setActiveDragging('time');
    onSelectIndex(Math.min(points.length - 1, Math.max(0, targetIdx)));
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const normX = Math.min(1, Math.max(0, moveX / rect.width));
    const targetIdx = Math.round(normX * (points.length - 1));

    if (activeDragging === 'time') {
      onSelectIndex(targetIdx);
    } else if (activeDragging === 'cursorA') {
      setCursorAIndex(targetIdx);
    } else if (activeDragging === 'cursorB') {
      setCursorBIndex(targetIdx);
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveDragging(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-200 space-y-4 shadow-sm">
      {/* Top Header: Title, Controls, Channel Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Digital Storage Oscilloscope (DSO)
          </h2>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-2">
            Multi-Channel Dynamic Waveforms
          </span>
        </div>

        {/* Cursors Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCursors(!showCursors)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              showCursors
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{showCursors ? 'Cursors Active' : 'Delta Cursors'}</span>
          </button>

          <button
            onClick={() => {
              setTimeZoom(1);
              setTimeOffset(0);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Reset Scope View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Screen */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="w-full h-full block"
        />

        {/* Live Channel Floating Telemetry Overlay (Top Right) */}
        <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded p-2 text-xs space-y-1 font-mono text-slate-300 shadow-lg pointer-events-none">
          <div className="text-cyan-400 flex justify-between gap-4">
            <span>vs(t):</span>
            <span className="font-bold">{(currentPt?.vs || 0).toFixed(1)} V</span>
          </div>
          <div className="text-amber-400 flex justify-between gap-4">
            <span>vo(t):</span>
            <span className="font-bold">{(currentPt?.vo || 0).toFixed(1)} V</span>
          </div>
          <div className="text-emerald-400 flex justify-between gap-4">
            <span>io(t):</span>
            <span className="font-bold">{(currentPt?.io || 0).toFixed(2)} A</span>
          </div>
          <div className="text-pink-400 flex justify-between gap-4">
            <span>is(t):</span>
            <span className="font-bold">{(currentPt?.is || 0).toFixed(2)} A</span>
          </div>
          <div className="text-slate-400 pt-1 border-t border-slate-800 flex justify-between gap-4">
            <span>Time (t):</span>
            <span>{((currentPt?.time || 0) * 1000).toFixed(2)} ms</span>
          </div>
          <div className="text-slate-400 flex justify-between gap-4">
            <span>Angle (ωt):</span>
            <span>{(currentPt?.thetaDeg || 0).toFixed(0)}°</span>
          </div>
        </div>

        {/* Delta Cursor Measurement Box (Bottom Left when enabled) */}
        {showCursors && (
          <div className="absolute bottom-2 left-2 bg-slate-900/95 backdrop-blur-md border border-amber-500/40 rounded p-2 text-xs font-mono space-y-0.5 text-slate-300 shadow-xl">
            <div className="text-amber-400 font-bold border-b border-slate-800 pb-0.5 mb-1">
              Dual Cursor Measurements
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Δt (Time Delta):</span>
              <span className="text-white font-semibold">{(deltaT * 1000).toFixed(2)} ms</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">1 / Δt (Frequency):</span>
              <span className="text-cyan-300 font-semibold">{freqEquivalent.toFixed(1)} Hz</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">ΔVo (Voltage Delta):</span>
              <span className="text-amber-300 font-semibold">{deltaVo.toFixed(1)} V</span>
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Playback & Time Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/70 border border-slate-700/60 rounded-lg p-2.5">
        {/* Play/Pause & Stepping */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 20))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Step Backward"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Scope</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSelectIndex(Math.min(points.length - 1, currentIndex + 20))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSelectIndex(0)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Reset to t = 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-700">
          <span className="text-[10px] text-slate-400 px-1.5 font-medium">Speed:</span>
          {[0.25, 0.5, 1, 2].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
                playbackSpeed === spd
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Time Scrubber Slider */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">0ms</span>
          <input
            type="range"
            min="0"
            max={points.length - 1}
            value={currentIndex}
            onChange={(e) => onSelectIndex(parseInt(e.target.value, 10))}
            aria-label="Simulation Time Scrubber"
            className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <span className="text-xs text-slate-400 font-mono">
            {((points[points.length - 1]?.time || 0) * 1000).toFixed(0)}ms
          </span>
        </div>
      </div>

      {/* Channel Toggles / Legend Strip */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
        <span className="text-xs text-slate-400 font-medium mr-1">Channels:</span>
        {Object.values(traces).map((tr) => (
          <button
            key={tr.id}
            onClick={() => toggleTrace(tr.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              tr.visible
                ? 'bg-slate-800 border-slate-700 text-white shadow-sm'
                : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: tr.visible ? tr.color : '#475569' }}
            />
            <span>{tr.name}</span>
            {tr.id === 'io' || tr.id === 'is' ? (
              <span className="text-[10px] text-slate-400 font-mono">(×10)</span>
            ) : null}
            {tr.visible ? (
              <Eye className="w-3 h-3 text-slate-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
