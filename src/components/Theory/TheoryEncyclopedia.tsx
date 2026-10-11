import React, { useState } from 'react';
import { TOPOLOGIES, CATEGORIES } from '../../simulation/topologies';
import { TopologyId } from '../../types/circuit';
import { BookOpen, CheckCircle, ChevronRight, Zap, AlertTriangle } from 'lucide-react';

export const TheoryEncyclopedia: React.FC = () => {
  const [selectedId, setSelectedId] = useState<TopologyId>('1ph_fw_bridge');
  const topology = TOPOLOGIES[selectedId];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white tracking-wide">
            Power Electronics Converter Theory & Design Reference
          </h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
          Comprehensive engineering compendium covering operating principles, mathematical derivations,
          conduction sequences, Fourier series, device stress ratings, and design considerations.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Topology Navigator */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Converter Catalog
          </h3>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                  {cat.name}
                </span>
                <div className="space-y-0.5">
                  {Object.values(TOPOLOGIES)
                    .filter((top) => top.category === cat.id)
                    .map((top) => (
                      <button
                        key={top.id}
                        onClick={() => setSelectedId(top.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                          selectedId === top.id
                            ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{top.name}</span>
                        {selectedId === top.id && (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: In-Depth Documentation Article */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 space-y-6">
          {/* Header Title */}
          <div className="border-b border-slate-800 pb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">
                {topology.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 border border-slate-700 text-cyan-300">
                  {topology.phaseCount}-Phase
                </span>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 border border-slate-700 text-emerald-300">
                  {topology.isControlled ? 'Controlled (SCR)' : 'Uncontrolled (Diode)'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {topology.fullDescription}
            </p>
          </div>

          {/* Circuit Operation & Conduction Sequence */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Circuit Operation & Commutation Dynamics
            </h4>
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-4 space-y-2 text-xs">
              <ul className="space-y-2 text-slate-300">
                {topology.theoryNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mathematical Formulations Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Fundamental Mathematical Expressions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-1">
                <span className="text-slate-400 font-medium">Average DC Output Voltage (Vo_avg):</span>
                <div className="font-mono text-amber-300 font-bold text-sm bg-slate-900 p-2 rounded border border-slate-800">
                  {topology.id.includes('1ph_hw_diode') && 'V_dc = V_m / π ≈ 0.318 V_m'}
                  {topology.id.includes('1ph_fw') && !topology.id.includes('scr') && 'V_dc = 2·V_m / π ≈ 0.637 V_m'}
                  {topology.id.includes('1ph_hw_scr') && 'V_dc = (V_m / 2π) · (1 + cos α)'}
                  {topology.id.includes('1ph_fw_scr_bridge') && 'V_dc = (2·V_m / π) · cos α (CCM)'}
                  {topology.id.includes('1ph_semi_bridge') && 'V_dc = (V_m / π) · (1 + cos α)'}
                  {topology.id.includes('3ph_hw_diode') && 'V_dc = (3√3·V_m) / 2π ≈ 0.827 V_m'}
                  {topology.id.includes('3ph_fw_bridge') && 'V_dc = (3·V_m,LL) / π ≈ 1.654 V_m,phase'}
                  {topology.id.includes('3ph_fw_scr_bridge') && 'V_dc = (3·V_m,LL / π) · cos α'}
                  {topology.id.includes('3ph_semi_bridge') && 'V_dc = (3·V_m,LL / 2π) · (1 + cos α)'}
                  {topology.id.includes('12_pulse') && 'V_dc = 2 · (3·V_m,LL / π) ≈ 3.308 V_m'}
                  {topology.id.includes('buck') && 'V_dc = D · V_in'}
                  {topology.id.includes('boost') && 'V_dc = V_in / (1 - D)'}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-lg space-y-1">
                <span className="text-slate-400 font-medium">Peak Inverse Voltage (PIV) Rating:</span>
                <div className="font-mono text-red-300 font-bold text-sm bg-slate-900 p-2 rounded border border-slate-800">
                  {topology.id === '1ph_fw_ct' ? 'PIV = 2 · V_m' : topology.phaseCount === 3 ? 'PIV = √3 · V_m,phase (V_m,LL)' : 'PIV = V_m'}
                </div>
              </div>
            </div>
          </div>

          {/* Advantages and Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5 space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Engineering Advantages
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {topology.advantages.map((adv, idx) => (
                  <li key={idx}>{adv}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 space-y-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Practical Limitations
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {topology.disadvantages.map((dis, idx) => (
                  <li key={idx}>{dis}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Industrial Applications */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Primary Industrial Applications
            </span>
            <div className="flex flex-wrap gap-2">
              {topology.applications.map((app, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
