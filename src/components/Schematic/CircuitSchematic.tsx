import React from 'react';
import {
  SimulationTimePoint,
  SimulationConfig,
} from '../../types/circuit';
import { TOPOLOGIES } from '../../simulation/topologies';

interface CircuitSchematicProps {
  config: SimulationConfig;
  currentPoint?: SimulationTimePoint;
}

export const CircuitSchematic: React.FC<CircuitSchematicProps> = ({
  config,
  currentPoint,
}) => {
  const topology = TOPOLOGIES[config.topologyId];
  const activeDevices = currentPoint?.activeDevices || [];
  const isFwdActive = activeDevices.includes('FWD');
  const isGateFired = (currentPoint?.vGate || 0) > 0.5;

  // Helper function to check if device is conducting
  const isDevOn = (devId: string) => activeDevices.includes(devId);

  // Common styles
  const wireColor = '#64748b'; // slate-500
  const activeWireColor = '#10b981'; // emerald-500
  const offDeviceStroke = '#475569'; // slate-600
  const onDeviceStroke = '#10b981'; // emerald-500
  const onDeviceFill = '#065f46'; // emerald-800

  // Standard Diode SVG Symbol
  const renderDiode = (
    x: number,
    y: number,
    id: string,
    label: string,
    rotation: number = 0
  ) => {
    const on = isDevOn(id);
    return (
      <g
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
        className="transition-all duration-150"
      >
        {/* Terminal Leads */}
        <line x1="-25" y1="0" x2="-10" y2="0" stroke={on ? activeWireColor : wireColor} strokeWidth="2.5" />
        <line x1="10" y1="0" x2="25" y2="0" stroke={on ? activeWireColor : wireColor} strokeWidth="2.5" />

        {/* Anode Triangle */}
        <polygon
          points="-10,-12 10,0 -10,12"
          fill={on ? onDeviceFill : '#1e293b'}
          stroke={on ? onDeviceStroke : offDeviceStroke}
          strokeWidth="2.5"
          className={on ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''}
        />

        {/* Cathode Bar */}
        <line
          x1="10"
          y1="-14"
          x2="10"
          y2="14"
          stroke={on ? onDeviceStroke : offDeviceStroke}
          strokeWidth="3"
        />

        {/* Label */}
        <text
          x="0"
          y={rotation === 90 ? "-20" : "-18"}
          fill={on ? '#34d399' : '#94a3b8'}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          transform={rotation !== 0 ? `rotate(${-rotation})` : undefined}
        >
          {label} {on ? '● ON' : ''}
        </text>
      </g>
    );
  };

  // Standard SCR / Thyristor SVG Symbol
  const renderThyristor = (
    x: number,
    y: number,
    id: string,
    label: string,
    rotation: number = 0
  ) => {
    const on = isDevOn(id);
    return (
      <g
        transform={`translate(${x}, ${y}) rotate(${rotation})`}
        className="transition-all duration-150"
      >
        {/* Leads */}
        <line x1="-25" y1="0" x2="-10" y2="0" stroke={on ? activeWireColor : wireColor} strokeWidth="2.5" />
        <line x1="10" y1="0" x2="25" y2="0" stroke={on ? activeWireColor : wireColor} strokeWidth="2.5" />

        {/* Anode Triangle */}
        <polygon
          points="-10,-12 10,0 -10,12"
          fill={on ? onDeviceFill : '#1e293b'}
          stroke={on ? onDeviceStroke : offDeviceStroke}
          strokeWidth="2.5"
          className={on ? 'filter drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''}
        />

        {/* Cathode Bar */}
        <line
          x1="10"
          y1="-14"
          x2="10"
          y2="14"
          stroke={on ? onDeviceStroke : offDeviceStroke}
          strokeWidth="3"
        />

        {/* Gate Lead */}
        <polyline
          points="8,8 16,16 26,16"
          fill="none"
          stroke={isGateFired && on ? '#a855f7' : '#64748b'}
          strokeWidth="2"
        />
        {isGateFired && (
          <circle cx="26" cy="16" r="3" fill="#c084fc" className="animate-pulse" />
        )}

        {/* Device Label */}
        <text
          x="0"
          y={rotation === 90 ? "-20" : "-18"}
          fill={on ? '#34d399' : '#94a3b8'}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          transform={rotation !== 0 ? `rotate(${-rotation})` : undefined}
        >
          {label} {on ? '● ON' : ''}
        </text>
      </g>
    );
  };

  // AC Sinusoidal Source Symbol
  const renderAcSource = (x: number, y: number, label: string = 'vs(t)') => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#0284c7" strokeWidth="2.5" />
      {/* Sine Wave */}
      <path
        d="M -12,0 Q -6,-10 0,0 Q 6,10 12,0"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2.5"
      />
      <text x="0" y="36" fill="#38bdf8" fontSize="11" fontWeight="600" textAnchor="middle">
        {label}
      </text>
      <text x="0" y="48" fill="#64748b" fontSize="9" textAnchor="middle">
        {config.supply.vRms}V RMS · {config.supply.frequency}Hz
      </text>
    </g>
  );

  // Load Branch SVG: R, RL, or RLE
  const renderLoad = (x: number, yTop: number, yBottom: number) => {
    const isCurrentFlowing = (currentPoint?.io || 0) > 1e-4;
    const lColor = isCurrentFlowing ? activeWireColor : wireColor;

    return (
      <g transform={`translate(${x}, 0)`}>
        {/* Top & Bottom Connection Points */}
        <line x1="0" y1={yTop} x2="0" y2={yTop + 20} stroke={lColor} strokeWidth="2.5" />
        <line x1="0" y1={yBottom - 20} x2="0" y2={yBottom} stroke={lColor} strokeWidth="2.5" />

        {/* Resistor Component */}
        <g transform={`translate(0, ${yTop + 45})`}>
          <path
            d="M 0,-25 L 10,-20 L -10,-10 L 10,0 L -10,10 L 10,20 L 0,25"
            fill="none"
            stroke={lColor}
            strokeWidth="2.5"
          />
          <text x="22" y="4" fill="#94a3b8" fontSize="11" fontWeight="600">
            R: {config.load.r} Ω
          </text>
        </g>

        {/* Inductor Component (if RL or RLE) */}
        {config.load.type !== 'R' && (
          <g transform={`translate(0, ${yTop + 115})`}>
            <line x1="0" y1="-25" x2="0" y2="-18" stroke={lColor} strokeWidth="2.5" />
            <path
              d="M 0,-18 C 14,-18 14,-6 0,-6 C 14,-6 14,6 0,6 C 14,6 14,18 0,18"
              fill="none"
              stroke={lColor}
              strokeWidth="2.5"
            />
            <line x1="0" y1="18" x2="0" y2="25" stroke={lColor} strokeWidth="2.5" />
            <text x="22" y="4" fill="#34d399" fontSize="11" fontWeight="600">
              L: {(config.load.l * 1000).toFixed(0)} mH
            </text>
          </g>
        )}

        {/* Back EMF Component (if RLE) */}
        {config.load.type === 'RLE' && (
          <g transform={`translate(0, ${yTop + 175})`}>
            <line x1="0" y1="-15" x2="0" y2="-5" stroke={lColor} strokeWidth="2.5" />
            {/* Battery Plates */}
            <line x1="-14" y1="-5" x2="14" y2="-5" stroke="#f59e0b" strokeWidth="3" />
            <line x1="-8" y1="5" x2="8" y2="5" stroke="#f59e0b" strokeWidth="2" />
            <line x1="0" y1="5" x2="0" y2="15" stroke={lColor} strokeWidth="2.5" />
            <text x="22" y="4" fill="#fbbf24" fontSize="11" fontWeight="600">
              E: {config.load.e} V
            </text>
            <text x="-22" y="-2" fill="#fbbf24" fontSize="9" textAnchor="middle">
              +
            </text>
          </g>
        )}

        {/* Output Voltage & Current Labels */}
        <text x="0" y={yTop - 8} fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">
          + Vo(t) : {(currentPoint?.vo || 0).toFixed(1)} V
        </text>
        <text x="0" y={yBottom + 16} fill="#64748b" fontSize="10" textAnchor="middle">
          - Return
        </text>

        {isCurrentFlowing && (
          <g transform={`translate(0, ${yTop + 10})`}>
            <polygon points="-4,-4 4,-4 0,4" fill="#10b981" />
            <text x="-12" y="0" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="end">
              io = {(currentPoint?.io || 0).toFixed(2)}A
            </text>
          </g>
        )}
      </g>
    );
  };

  // Freewheeling Diode Branch
  const renderFwdBranch = (x: number, yTop: number, yBottom: number) => {
    if (!config.fwd.isApplicable) return null;

    const conducting = isFwdActive;
    const enabled = config.fwd.enabled;

    return (
      <g transform={`translate(${x}, 0)`}>
        {/* Vertical Rail connecting top to bottom */}
        <line
          x1="0"
          y1={yTop}
          x2="0"
          y2={yTop + 60}
          stroke={conducting ? activeWireColor : wireColor}
          strokeWidth="2"
          strokeDasharray={enabled ? undefined : '4 4'}
        />
        <line
          x1="0"
          y1={yBottom - 60}
          x2="0"
          y2={yBottom}
          stroke={conducting ? activeWireColor : wireColor}
          strokeWidth="2"
          strokeDasharray={enabled ? undefined : '4 4'}
        />

        {/* Diode in vertical orientation (Cathode UP to positive rail, Anode DOWN) */}
        {renderDiode(0, (yTop + yBottom) / 2, 'FWD', 'D_FWD', -90)}

        {/* Status text */}
        <text
          x="0"
          y={(yTop + yBottom) / 2 + 35}
          fill={conducting ? '#34d399' : enabled ? '#94a3b8' : '#64748b'}
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
        >
          {conducting ? 'FREEWHEELING' : enabled ? 'FWD Ready' : 'FWD Disabled'}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
      {/* Schematic Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Electrical Circuit Schematic:</span>
            <span className="text-emerald-400 font-bold">{topology.name}</span>
          </h2>
          <span className="text-xs text-slate-400">
            Real-time interactive conduction path and switch states at t = {((currentPoint?.time || 0) * 1000).toFixed(2)} ms (ωt = {(currentPoint?.thetaDeg || 0).toFixed(0)}°)
          </span>
        </div>

        {/* Conduction Status Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-mono">
              Active: {activeDevices.length > 0 ? activeDevices.join(' + ') : 'Zero (Off)'}
            </span>
          </div>
          <div className="text-xs text-slate-400 bg-slate-800/60 px-2 py-1 rounded border border-slate-700">
            Mode: <span className="font-semibold text-slate-200">{currentPoint?.conductionMode || 'CCM'}</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[340px] sm:h-[380px] bg-slate-950/70 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 740 380"
          className="w-full h-full max-h-[380px] select-none"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="schematic-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#1e293b" />
            </pattern>
            {/* Glow filters */}
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background */}
          <rect width="100%" height="100%" fill="url(#schematic-grid)" />

          {/* ======================================================== */}
          {/* TOPOLOGY SPECIFIC SCHEMATIC DIAGRAMS                     */}
          {/* ======================================================== */}

          {/* 1. SINGLE-PHASE HALF-WAVE (DIODE OR SCR) */}
          {(config.topologyId === '1ph_hw_diode' || config.topologyId === '1ph_hw_scr') && (
            <g>
              {/* AC Source at (120, 190) */}
              {renderAcSource(120, 190, 'vs(t)')}

              {/* Wire from AC Source Top to Switch */}
              <line
                x1="120"
                y1="168"
                x2="120"
                y2="90"
                stroke={isDevOn(config.topologyId === '1ph_hw_diode' ? 'D1' : 'T1') ? activeWireColor : wireColor}
                strokeWidth="2.5"
              />
              <line
                x1="120"
                y1="90"
                x2="245"
                y2="90"
                stroke={isDevOn(config.topologyId === '1ph_hw_diode' ? 'D1' : 'T1') ? activeWireColor : wireColor}
                strokeWidth="2.5"
              />

              {/* Diode D1 or SCR T1 at (270, 90) */}
              {config.topologyId === '1ph_hw_diode'
                ? renderDiode(270, 90, 'D1', 'D1')
                : renderThyristor(270, 90, 'T1', 'T1')}

              {/* Top Rail from Switch to Load */}
              <line
                x1="295"
                y1="90"
                x2="600"
                y2="90"
                stroke={(currentPoint?.io || 0) > 1e-4 ? activeWireColor : wireColor}
                strokeWidth="2.5"
              />

              {/* Freewheeling Branch at x = 440 */}
              {renderFwdBranch(440, 90, 290)}

              {/* Connection to FWD Top & Bottom */}
              {config.fwd.isApplicable && (
                <>
                  <circle cx="440" cy="90" r="3.5" fill={wireColor} />
                  <circle cx="440" cy="290" r="3.5" fill={wireColor} />
                </>
              )}

              {/* Load at x = 600 */}
              {renderLoad(600, 90, 290)}

              {/* Bottom Return Rail */}
              <line
                x1="600"
                y1="290"
                x2="120"
                y2="290"
                stroke={(currentPoint?.io || 0) > 1e-4 ? activeWireColor : wireColor}
                strokeWidth="2.5"
              />
              <line
                x1="120"
                y1="290"
                x2="120"
                y2="212"
                stroke={(currentPoint?.io || 0) > 1e-4 && !isFwdActive ? activeWireColor : wireColor}
                strokeWidth="2.5"
              />

              {/* Animated Electron / Current flow on active loop */}
              {(currentPoint?.io || 0) > 1e-4 && (
                <rect
                  x="120"
                  y="90"
                  width={isFwdActive ? "320" : "480"}
                  height="200"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  className="opacity-75 animate-[dash_1s_linear_infinite]"
                />
              )}
            </g>
          )}

          {/* 2. SINGLE-PHASE FULL-WAVE CENTRE-TAPPED */}
          {config.topologyId === '1ph_fw_ct' && (
            <g>
              {/* Primary AC Source */}
              {renderAcSource(80, 190, 'v_pri(t)')}

              {/* Transformer Core & Windings */}
              <g transform="translate(180, 190)">
                <line x1="-30" y1="-80" x2="-30" y2="80" stroke="#0284c7" strokeWidth="2.5" />
                {/* Magnetic Core double lines */}
                <line x1="-10" y1="-90" x2="-10" y2="90" stroke="#64748b" strokeWidth="2" strokeDasharray="6 3" />
                <line x1="-5" y1="-90" x2="-5" y2="90" stroke="#64748b" strokeWidth="2" strokeDasharray="6 3" />
                {/* Secondary upper winding */}
                <line x1="15" y1="-90" x2="15" y2="0" stroke="#0284c7" strokeWidth="2.5" />
                {/* Secondary lower winding */}
                <line x1="15" y1="0" x2="15" y2="90" stroke="#0284c7" strokeWidth="2.5" />
                {/* Centre Tap */}
                <line x1="15" y1="0" x2="420" y2="0" stroke={wireColor} strokeWidth="2" />
                <circle cx="15" cy="0" r="3" fill="#38bdf8" />
                <text x="35" y="-6" fill="#38bdf8" fontSize="10">Centre Tap (0V Neutral)</text>
              </g>

              {/* Diode D1 (Upper) at (290, 100) */}
              <line x1="195" y1="100" x2="265" y2="100" stroke={isDevOn('D1') ? activeWireColor : wireColor} strokeWidth="2.5" />
              {renderDiode(290, 100, 'D1', 'D1')}
              <line x1="315" y1="100" x2="480" y2="100" stroke={isDevOn('D1') ? activeWireColor : wireColor} strokeWidth="2.5" />

              {/* Diode D2 (Lower) at (290, 280) */}
              <line x1="195" y1="280" x2="265" y2="280" stroke={isDevOn('D2') ? activeWireColor : wireColor} strokeWidth="2.5" />
              {renderDiode(290, 280, 'D2', 'D2')}
              <line x1="315" y1="280" x2="480" y2="280" stroke={isDevOn('D2') ? activeWireColor : wireColor} strokeWidth="2.5" />

              {/* Common Cathode Tie at x = 480 */}
              <line x1="480" y1="100" x2="480" y2="280" stroke={activeWireColor} strokeWidth="2.5" />
              <line x1="480" y1="190" x2="600" y2="100" stroke={activeWireColor} strokeWidth="2.5" />

              {/* FWD Branch */}
              {renderFwdBranch(520, 100, 260)}

              {/* Load at (620, 100-260) */}
              {renderLoad(620, 100, 260)}
              <line x1="620" y1="260" x2="195" y2="190" stroke={wireColor} strokeWidth="2.5" />
            </g>
          )}

          {/* 3. SINGLE-PHASE FULL-WAVE BRIDGE (DIODE, SCR, OR SEMI) */}
          {(config.topologyId === '1ph_fw_bridge' ||
            config.topologyId === '1ph_fw_scr_bridge' ||
            config.topologyId === '1ph_semi_bridge' ||
            config.topologyId === 'dual_converter') && (
            <g>
              {/* AC Source */}
              {renderAcSource(100, 190, 'vs(t)')}

              {/* Bridge Arms at (280, 110), (380, 110), (280, 270), (380, 270) */}
              {/* Top Left: D1 or T1 */}
              {config.topologyId === '1ph_fw_bridge'
                ? renderDiode(280, 110, 'D1', 'D1', 90)
                : renderThyristor(280, 110, 'T1', 'T1', 90)}

              {/* Top Right: D3 or T3 */}
              {config.topologyId === '1ph_fw_bridge'
                ? renderDiode(380, 110, 'D3', 'D3', 90)
                : config.topologyId === '1ph_semi_bridge'
                ? renderDiode(380, 110, 'D1', 'D1', 90)
                : renderThyristor(380, 110, 'T3', 'T3', 90)}

              {/* Bottom Left: D4 or T4 */}
              {config.topologyId === '1ph_fw_bridge'
                ? renderDiode(280, 270, 'D4', 'D4', 90)
                : config.topologyId === '1ph_semi_bridge'
                ? renderDiode(280, 270, 'D2', 'D2', 90)
                : renderThyristor(280, 270, 'T4', 'T4', 90)}

              {/* Bottom Right: D2 or T2 */}
              {config.topologyId === '1ph_fw_bridge'
                ? renderDiode(380, 270, 'D2', 'D2', 90)
                : config.topologyId === '1ph_semi_bridge'
                ? renderThyristor(380, 270, 'T2', 'T2', 90)
                : renderThyristor(380, 270, 'T2', 'T2', 90)}

              {/* AC Input Wire: Phase to Left Midpoint (280, 190) */}
              <line x1="100" y1="168" x2="100" y2="190" stroke={wireColor} strokeWidth="2.5" />
              <line x1="100" y1="190" x2="280" y2="190" stroke={wireColor} strokeWidth="2.5" />
              <circle cx="280" cy="190" r="3.5" fill="#38bdf8" />

              {/* AC Input Wire: Return to Right Midpoint (380, 190) */}
              <line x1="100" y1="212" x2="100" y2="230" stroke={wireColor} strokeWidth="2.5" />
              <line x1="100" y1="230" x2="240" y2="230" stroke={wireColor} strokeWidth="2.5" />
              <line x1="240" y1="230" x2="240" y2="190" stroke={wireColor} strokeWidth="2.5" />
              <line x1="240" y1="190" x2="380" y2="190" stroke={wireColor} strokeWidth="2.5" />
              <circle cx="380" cy="190" r="3.5" fill="#38bdf8" />

              {/* DC Positive Rail at y = 60 */}
              <line x1="280" y1="85" x2="280" y2="60" stroke={activeWireColor} strokeWidth="2.5" />
              <line x1="380" y1="85" x2="380" y2="60" stroke={activeWireColor} strokeWidth="2.5" />
              <line x1="280" y1="60" x2="620" y2="60" stroke={activeWireColor} strokeWidth="2.5" />

              {/* DC Negative Rail at y = 320 */}
              <line x1="280" y1="295" x2="280" y2="320" stroke={wireColor} strokeWidth="2.5" />
              <line x1="380" y1="295" x2="380" y2="320" stroke={wireColor} strokeWidth="2.5" />
              <line x1="280" y1="320" x2="620" y2="320" stroke={wireColor} strokeWidth="2.5" />

              {/* Freewheeling Branch at x = 490 */}
              {renderFwdBranch(490, 60, 320)}

              {/* Load at x = 620 */}
              {renderLoad(620, 60, 320)}
            </g>
          )}

          {/* 4. THREE-PHASE CONVERTERS (HW, 6-PULSE BRIDGE, 12-PULSE) */}
          {(config.topologyId === '3ph_hw_diode' ||
            config.topologyId === '3ph_hw_scr' ||
            config.topologyId === '3ph_fw_bridge' ||
            config.topologyId === '3ph_fw_scr_bridge' ||
            config.topologyId === '3ph_semi_bridge' ||
            config.topologyId === '12_pulse_bridge') && (
            <g>
              {/* 3-Phase Sources (Va, Vb, Vc) */}
              <g transform="translate(80, 110)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
                <text x="0" y="4" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">Va</text>
                <text x="-24" y="4" fill="#94a3b8" fontSize="9">Phase A</text>
              </g>

              <g transform="translate(80, 190)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#eab308" strokeWidth="2" />
                <text x="0" y="4" fill="#eab308" fontSize="10" fontWeight="bold" textAnchor="middle">Vb</text>
                <text x="-24" y="4" fill="#94a3b8" fontSize="9">Phase B</text>
              </g>

              <g transform="translate(80, 270)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
                <text x="0" y="4" fill="#3b82f6" fontSize="10" fontWeight="bold" textAnchor="middle">Vc</text>
                <text x="-24" y="4" fill="#94a3b8" fontSize="9">Phase C</text>
              </g>

              {/* Converter Bridge Columns */}
              {/* Column A (x = 240) */}
              <line x1="96" y1="110" x2="240" y2="110" stroke="#ef4444" strokeWidth="2" />
              {config.topologyId.includes('scr')
                ? renderThyristor(240, 80, 'T1', 'T1 (A+)', 90)
                : renderDiode(240, 80, 'D1', 'D1 (A+)', 90)}

              {/* Column B (x = 330) */}
              <line x1="96" y1="190" x2="330" y2="190" stroke="#eab308" strokeWidth="2" />
              {config.topologyId.includes('scr')
                ? renderThyristor(330, 80, 'T3', 'T3 (B+)', 90)
                : renderDiode(330, 80, 'D3', 'D3 (B+)', 90)}

              {/* Column C (x = 420) */}
              <line x1="96" y1="270" x2="420" y2="270" stroke="#3b82f6" strokeWidth="2" />
              {config.topologyId.includes('scr')
                ? renderThyristor(420, 80, 'T5', 'T5 (C+)', 90)
                : renderDiode(420, 80, 'D5', 'D5 (C+)', 90)}

              {/* Bottom Return Rail / Lower Bridge Bank */}
              {config.topologyId.includes('hw') ? (
                // Half-Wave: Common Neutral Return at bottom
                <>
                  <line x1="240" y1="40" x2="620" y2="40" stroke={activeWireColor} strokeWidth="2.5" />
                  <line x1="330" y1="40" x2="420" y2="40" stroke={activeWireColor} strokeWidth="2.5" />
                  {/* Neutral line */}
                  <line x1="30" y1="330" x2="620" y2="330" stroke="#64748b" strokeWidth="2.5" strokeDasharray="5 3" />
                  <text x="50" y="345" fill="#94a3b8" fontSize="10">Neutral Return (N)</text>
                  {renderLoad(620, 40, 330)}
                </>
              ) : (
                // 6-Pulse Bridge: Lower Diodes / SCRs at y = 290
                <>
                  {/* Top positive DC rail at y = 40 */}
                  <line x1="240" y1="40" x2="620" y2="40" stroke={activeWireColor} strokeWidth="2.5" />
                  <line x1="240" y1="55" x2="240" y2="40" stroke={activeWireColor} strokeWidth="2.5" />
                  <line x1="330" y1="55" x2="330" y2="40" stroke={activeWireColor} strokeWidth="2.5" />
                  <line x1="420" y1="55" x2="420" y2="40" stroke={activeWireColor} strokeWidth="2.5" />

                  {/* Lower group devices at (240, 240), (330, 240), (420, 240) */}
                  {config.topologyId === '3ph_fw_bridge' ? (
                    <>
                      {renderDiode(240, 240, 'D4', 'D4 (A-)', 90)}
                      {renderDiode(330, 240, 'D6', 'D6 (B-)', 90)}
                      {renderDiode(420, 240, 'D2', 'D2 (C-)', 90)}
                    </>
                  ) : config.topologyId === '3ph_semi_bridge' ? (
                    <>
                      {renderDiode(240, 240, 'D4', 'D4 (A-)', 90)}
                      {renderDiode(330, 240, 'D6', 'D6 (B-)', 90)}
                      {renderDiode(420, 240, 'D2', 'D2 (C-)', 90)}
                    </>
                  ) : (
                    <>
                      {renderThyristor(240, 240, 'T4', 'T4 (A-)', 90)}
                      {renderThyristor(330, 240, 'T6', 'T6 (B-)', 90)}
                      {renderThyristor(420, 240, 'T2', 'T2 (C-)', 90)}
                    </>
                  )}

                  {/* Bottom negative DC rail at y = 330 */}
                  <line x1="240" y1="330" x2="620" y2="330" stroke={wireColor} strokeWidth="2.5" />
                  <line x1="240" y1="265" x2="240" y2="330" stroke={wireColor} strokeWidth="2.5" />
                  <line x1="330" y1="265" x2="330" y2="330" stroke={wireColor} strokeWidth="2.5" />
                  <line x1="420" y1="265" x2="420" y2="330" stroke={wireColor} strokeWidth="2.5" />

                  {/* FWD Branch */}
                  {renderFwdBranch(520, 40, 330)}

                  {/* Load */}
                  {renderLoad(620, 40, 330)}
                </>
              )}
            </g>
          )}

          {/* 5. DC CHOPPERS (BUCK / BOOST) */}
          {(config.topologyId === 'buck_converter' || config.topologyId === 'boost_converter') && (
            <g>
              {/* DC Source */}
              <g transform="translate(100, 190)">
                <line x1="-15" y1="-25" x2="15" y2="-25" stroke="#38bdf8" strokeWidth="4" />
                <line x1="-8" y1="-15" x2="8" y2="-15" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="20" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Vin: {config.supply.vRms} V DC
                </text>
              </g>

              {/* Top rail */}
              <line x1="100" y1="165" x2="100" y2="90" stroke={activeWireColor} strokeWidth="2.5" />
              <line x1="100" y1="90" x2="220" y2="90" stroke={activeWireColor} strokeWidth="2.5" />

              {/* Main Switch Q1 at (250, 90) */}
              <g transform="translate(250, 90)">
                <rect
                  x="-20"
                  y="-12"
                  width="40"
                  height="24"
                  rx="4"
                  fill={isDevOn('Q1') ? onDeviceFill : '#1e293b'}
                  stroke={isDevOn('Q1') ? onDeviceStroke : offDeviceStroke}
                  strokeWidth="2.5"
                />
                <text x="0" y="4" fill={isDevOn('Q1') ? '#34d399' : '#94a3b8'} fontSize="10" fontWeight="bold" textAnchor="middle">
                  Q1 (PWM)
                </text>
              </g>

              <line x1="270" y1="90" x2="600" y2="90" stroke={activeWireColor} strokeWidth="2.5" />

              {/* Freewheeling Diode at (380, 190) */}
              {renderDiode(380, 190, 'D_FWD', 'D_FWD', -90)}
              <line x1="380" y1="90" x2="380" y2="165" stroke={wireColor} strokeWidth="2" />
              <line x1="380" y1="215" x2="380" y2="290" stroke={wireColor} strokeWidth="2" />

              {/* Load */}
              {renderLoad(600, 90, 290)}

              {/* Bottom rail */}
              <line x1="100" y1="215" x2="100" y2="290" stroke={wireColor} strokeWidth="2.5" />
              <line x1="100" y1="290" x2="600" y2="290" stroke={wireColor} strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {/* Floating Probe Badge on Canvas */}
        <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-300 font-mono shadow-md">
          <span className="text-cyan-400 font-semibold">Instantaneous: </span>
          vs = <span className="text-white">{(currentPoint?.vs || 0).toFixed(1)}V</span> ·
          vo = <span className="text-amber-400 font-semibold">{(currentPoint?.vo || 0).toFixed(1)}V</span> ·
          io = <span className="text-emerald-400 font-semibold">{(currentPoint?.io || 0).toFixed(2)}A</span>
        </div>
      </div>

      {/* Interval Explanation Banner */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-lg p-2.5 text-xs text-slate-300 flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="text-emerald-300">Conduction State: </strong>
          {currentPoint?.intervalDescription || 'Simulation initialized.'}
        </p>
      </div>
    </div>
  );
};
