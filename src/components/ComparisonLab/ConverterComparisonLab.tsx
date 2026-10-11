import React, { useState, useMemo } from 'react';
import {
  TopologyId,
  SimulationConfig,
  SimulationResult,
} from '../../types/circuit';
import { TOPOLOGIES } from '../../simulation/topologies';
import { runCompleteSimulation } from '../../simulation/simulationRunner';
import { Layers, ArrowRight, Zap, Check, AlertCircle } from 'lucide-react';

interface ConverterComparisonLabProps {
  baseConfig: SimulationConfig;
}

export const ConverterComparisonLab: React.FC<ConverterComparisonLabProps> = ({
  baseConfig,
}) => {
  const [converter1Id, setConverter1Id] = useState<TopologyId>('1ph_hw_diode');
  const [converter2Id, setConverter2Id] = useState<TopologyId>('1ph_fw_bridge');
  const [converter3Id, setConverter3Id] = useState<TopologyId>('3ph_fw_bridge');

  // Compute simulations for all 3 topologies under identical base conditions
  const result1: SimulationResult = useMemo(() => {
    const cfg: SimulationConfig = {
      ...baseConfig,
      topologyId: converter1Id,
      controlled: {
        ...baseConfig.controlled,
        firingAngleDeg: TOPOLOGIES[converter1Id].defaultAlpha,
      },
    };
    return runCompleteSimulation(cfg);
  }, [baseConfig, converter1Id]);

  const result2: SimulationResult = useMemo(() => {
    const cfg: SimulationConfig = {
      ...baseConfig,
      topologyId: converter2Id,
      controlled: {
        ...baseConfig.controlled,
        firingAngleDeg: TOPOLOGIES[converter2Id].defaultAlpha,
      },
    };
    return runCompleteSimulation(cfg);
  }, [baseConfig, converter2Id]);

  const result3: SimulationResult = useMemo(() => {
    const cfg: SimulationConfig = {
      ...baseConfig,
      topologyId: converter3Id,
      controlled: {
        ...baseConfig.controlled,
        firingAngleDeg: TOPOLOGIES[converter3Id].defaultAlpha,
      },
    };
    return runCompleteSimulation(cfg);
  }, [baseConfig, converter3Id]);

  const comps = [
    { id: converter1Id, top: TOPOLOGIES[converter1Id], res: result1, color: '#06b6d4' },
    { id: converter2Id, top: TOPOLOGIES[converter2Id], res: result2, color: '#f59e0b' },
    { id: converter3Id, top: TOPOLOGIES[converter3Id], res: result3, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            Multi-Topology Converter Comparison Laboratory
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Evaluate up to three distinct rectifier topologies simultaneously under equivalent electrical supply conditions
          ({baseConfig.supply.vRms}V RMS, {baseConfig.supply.frequency}Hz) and load parameters
          (Load: {baseConfig.load.type}, R = {baseConfig.load.r}Ω
          {baseConfig.load.type !== 'R' ? `, L = ${(baseConfig.load.l * 1000).toFixed(0)}mH` : ''}).
        </p>
      </div>

      {/* Converter Selectors Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comps.map((c, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Converter #{i + 1}
              </span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: c.color }}
              />
            </div>

            <select
              value={c.id}
              onChange={(e) => {
                const val = e.target.value as TopologyId;
                if (i === 0) setConverter1Id(val);
                else if (i === 1) setConverter2Id(val);
                else setConverter3Id(val);
              }}
              aria-label={`Select Converter #${i + 1}`}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.values(TOPOLOGIES).map((top) => (
                <option key={top.id} value={top.id}>
                  {top.name}
                </option>
              ))}
            </select>

            <div className="text-xs text-slate-400 leading-relaxed">
              {c.top.shortDescription}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Switches:</span>
              <span className="text-white font-semibold">{c.top.devices.length} devices</span>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side Electrical Metrics Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-wide border-b border-slate-800 pb-3">
          Direct Numerical Performance Metrics Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Performance Metric</th>
                {comps.map((c, i) => (
                  <th key={i} className="py-2.5 px-3 font-semibold" style={{ color: c.color }}>
                    {c.top.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Average Output (Vo_avg)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 font-bold text-amber-300">
                    {c.res.metrics.voAvg.toFixed(2)} V
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">RMS Output (Vo_rms)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-amber-400">
                    {c.res.metrics.voRms.toFixed(2)} V
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Average Load Current (Io_avg)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 font-bold text-emerald-300">
                    {c.res.metrics.ioAvg.toFixed(2)} A
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Voltage Ripple Factor (RF_v)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      c.res.metrics.voltageRippleFactor < 0.2
                        ? 'bg-emerald-950/60 text-emerald-300'
                        : 'bg-amber-950/60 text-amber-300'
                    }`}>
                      {(c.res.metrics.voltageRippleFactor * 100).toFixed(1)}%
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Voltage Form Factor (FF)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-slate-300">
                    {c.res.metrics.formFactor.toFixed(3)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Input Power Factor (True PF)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 font-bold text-cyan-300">
                    {c.res.harmonics.truePowerFactor.toFixed(3)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Current THD (THD_i)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-pink-400">
                    {c.res.harmonics.thdCurrentPercent.toFixed(1)}%
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Useful DC Power (P_dc)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-cyan-300">
                    {c.res.metrics.pDc.toFixed(1)} W
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Peak Inverse Voltage (PIV)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-red-300">
                    {c.res.metrics.peakInverseVoltage.toFixed(1)} V
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2.5 px-3 font-sans text-white font-medium">Rectification Efficiency (η)</td>
                {comps.map((c, i) => (
                  <td key={i} className="py-2.5 px-3 text-emerald-400 font-bold">
                    {c.res.metrics.efficiencyPercent.toFixed(1)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade-offs & Engineering Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {comps.map((c, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
            <h4 className="font-bold text-white text-sm" style={{ color: c.color }}>
              {c.top.name}
            </h4>

            <div className="space-y-1.5">
              <span className="font-semibold text-emerald-400 block">Key Advantages:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {c.top.advantages.map((adv, idx) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-amber-400 block">Limitations:</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                {c.top.disadvantages.map((dis, idx) => (
                  <li key={idx}>{dis}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800">
              <span className="font-semibold text-slate-400 block">Typical Applications:</span>
              <p className="text-slate-300">{c.top.applications.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
