import React, { useState } from 'react';
import { SimulationConfig } from '../../types/circuit';
import { X, Play, Bookmark, Trash2, Plus, Check } from 'lucide-react';

interface PresetExperiment {
  id: string;
  title: string;
  description: string;
  objective: string;
  config: SimulationConfig;
}

const PRESET_EXPERIMENTS: PresetExperiment[] = [
  {
    id: 'exp1_rl_dcm',
    title: 'Exp 1: RL Load Discontinuous Conduction & Extinction Angle (β)',
    description: 'Observe how stored magnetic energy in inductor L causes diode D1 to conduct into negative AC half-cycle until current reaches zero at extinction angle β > 180°.',
    objective: 'Measure extinction angle β, verify load current decay, and observe negative output voltage interval.',
    config: {
      topologyId: '1ph_hw_diode',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 25, l: 0.08, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp2_fwd_clamping',
    title: 'Exp 2: Freewheeling Diode Clamping & Ripple Suppression',
    description: 'Connect an external freewheeling diode across an RL load in a half-wave rectifier. Compare how FWD clamps negative voltage excursions and keeps output DC strictly positive.',
    objective: 'Demonstrate diode commutation at π, freewheeling current circulation, and elimination of negative voltage.',
    config: {
      topologyId: '1ph_hw_diode',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 25, l: 0.08, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: true, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp3_full_converter_alpha',
    title: 'Exp 3: Fully-Controlled Bridge Phase Delay Sweep (α = 45°)',
    description: 'Investigate thyristor firing delay angle α in a single-phase bridge converter with RL load. Check theoretical Vo = (2Vm/π)·cos(α).',
    objective: 'Verify gate pulse synchronization, continuous conduction mode (CCM), and power factor reduction as α increases.',
    config: {
      topologyId: '1ph_fw_scr_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 20, l: 0.1, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 45, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp4_semi_converter',
    title: 'Exp 4: Semi-Controlled Bridge with Inherent Freewheeling',
    description: 'Verify why the semi-controlled bridge with 2 SCRs and 2 diodes naturally freewheels inductive current without requiring an external diode.',
    objective: 'Observe natural freewheeling intervals between π and π+α and verify Vo = (Vm/π)·(1+cos α).',
    config: {
      topologyId: '1ph_semi_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 20, l: 0.06, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 60, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: 'Inherent in topology' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp5_3phase_6pulse',
    title: 'Exp 5: Three-Phase 6-Pulse Diode Bridge (Industrial Standard)',
    description: 'Analyze industrial 6-pulse diode bridge supplying DC loads. Note ultra-low voltage ripple (4.2%) and 300Hz fundamental ripple frequency.',
    objective: 'Verify 60° commutation sequence, line-to-line conduction envelope, and AC line current 5th & 7th harmonics.',
    config: {
      topologyId: '3ph_fw_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 15, l: 0.04, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: 'Never reaches zero' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp6_12pulse_harmonics',
    title: 'Exp 6: 12-Pulse Bridge Harmonic Cancellation (HVDC Standard)',
    description: 'Examine dual 6-pulse bridges with 30° Y-Y and Y-Δ transformer phase shift. Verify cancellation of 5th and 7th harmonic line currents.',
    objective: 'Confirm 12-pulse DC output with 600 Hz ripple and absence of 5th and 7th harmonics in the FFT spectrum.',
    config: {
      topologyId: '12_pulse_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 30, l: 0.05, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: 'Not applicable' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
  {
    id: 'exp7_rle_motor_inversion',
    title: 'Exp 7: DC Motor RLE Load & Two-Quadrant Inverter Mode (α = 120°)',
    description: 'Demonstrate regenerative braking where power is recovered from DC motor back-EMF and injected back into the AC utility grid.',
    objective: 'Observe negative average output voltage Vo_avg < 0 while current remains unidirectional Io > 0, verifying electrical power flow reversal.',
    config: {
      topologyId: '1ph_fw_scr_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RLE', r: 10, l: 0.1, e: 80, initialCurrent: 0 },
      controlled: { firingAngleDeg: 120, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0.8, scrDrop: 1.2, deviceRon: 0.05, sourceR: 0.2 },
      fwd: { enabled: false, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    },
  },
];

interface SavedExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExperiment: (cfg: SimulationConfig) => void;
  currentConfig: SimulationConfig;
}

export const SavedExperimentsModal: React.FC<SavedExperimentsModalProps> = ({
  isOpen,
  onClose,
  onLoadExperiment,
  currentConfig,
}) => {
  const [customExperiments, setCustomExperiments] = useState<PresetExperiment[]>(() => {
    try {
      const saved = localStorage.getItem('pe_custom_experiments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!newExpTitle.trim()) return;
    const newExp: PresetExperiment = {
      id: `custom_${Date.now()}`,
      title: newExpTitle.trim(),
      description: newExpNotes.trim() || 'User configured circuit experiment.',
      objective: 'Custom parameter verification.',
      config: currentConfig,
    };
    const updated = [...customExperiments, newExp];
    setCustomExperiments(updated);
    try {
      localStorage.setItem('pe_custom_experiments', JSON.stringify(updated));
    } catch {}
    setNewExpTitle('');
    setNewExpNotes('');
    setIsSavingCustom(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customExperiments.filter((e) => e.id !== id);
    setCustomExperiments(updated);
    try {
      localStorage.setItem('pe_custom_experiments', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col text-slate-200 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Laboratory Experiments & Standard Presets
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Preset Experiments */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Classical Undergraduate Laboratory Experiments
            </span>
            <div className="space-y-2.5">
              {PRESET_EXPERIMENTS.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/50 rounded-lg p-3.5 space-y-2 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white">
                      {exp.title}
                    </h4>
                    <button
                      onClick={() => {
                        onLoadExperiment(exp.config);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Load Experiment
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {exp.description}
                  </p>
                  <div className="text-[11px] text-emerald-300 font-mono bg-slate-900/60 px-2 py-1 rounded">
                    Objective: {exp.objective}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Custom Saved Experiments */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                User Custom Saved Experiments ({customExperiments.length})
              </span>
              <button
                onClick={() => setIsSavingCustom(!isSavingCustom)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current Circuit
              </button>
            </div>

            {isSavingCustom && (
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Experiment Title (e.g. Inverter Mode at α = 135°)"
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <textarea
                  placeholder="Experiment notes or observation guidelines..."
                  value={newExpNotes}
                  onChange={(e) => setNewExpNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsSavingCustom(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCurrent}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            )}

            {customExperiments.length > 0 ? (
              <div className="space-y-2">
                {customExperiments.map((exp) => (
                  <div
                    key={exp.id}
                    className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{exp.title}</div>
                      <div className="text-slate-400 text-[11px]">{exp.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onLoadExperiment(exp.config);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteCustom(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No custom experiments saved yet. Click "Save Current Circuit" to save your custom parameter sets.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
