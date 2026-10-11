import React from 'react';
import {
  SimulationConfig,
  LoadType,
  TopologyId,
} from '../../types/circuit';
import { TOPOLOGIES, CATEGORIES } from '../../simulation/topologies';
import { Sliders, Settings2, ShieldAlert, Cpu, Activity } from 'lucide-react';

interface ParameterControlsProps {
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  config,
  onChangeConfig,
}) => {
  const currentTopology = TOPOLOGIES[config.topologyId];

  // Helper to update specific fields in config
  const updateSupply = (field: string, val: number) => {
    onChangeConfig({
      ...config,
      supply: {
        ...config.supply,
        [field]: val,
      },
    });
  };

  const updateLoad = (field: string, val: any) => {
    const newLoad = {
      ...config.load,
      [field]: val,
    };

    // Evaluate FWD applicability based on load type and topology
    let isFwdApplicable = false;
    let reason = '';

    if (newLoad.type === 'R') {
      isFwdApplicable = false;
      reason = 'Not applicable: Purely resistive load does not store magnetic energy; output voltage cannot reverse.';
    } else if (currentTopology.fwdCapability.naturalFreewheelingInherent) {
      isFwdApplicable = false;
      reason = currentTopology.fwdCapability.reasonWhenDisabled;
    } else if (!currentTopology.fwdCapability.canHaveFwd) {
      isFwdApplicable = false;
      reason = currentTopology.fwdCapability.reasonWhenDisabled;
    } else {
      isFwdApplicable = true;
      reason = 'Applicable: Connected across load to bypass stored inductive current and clamp negative voltage.';
    }

    onChangeConfig({
      ...config,
      load: newLoad,
      fwd: {
        ...config.fwd,
        isApplicable: isFwdApplicable,
        reasonIfNot: reason,
        enabled: isFwdApplicable ? config.fwd.enabled : false,
      },
    });
  };

  const updateControlled = (field: string, val: number) => {
    onChangeConfig({
      ...config,
      controlled: {
        ...config.controlled,
        [field]: val,
      },
    });
  };

  const updatePractical = (field: string, val: any) => {
    onChangeConfig({
      ...config,
      practical: {
        ...config.practical,
        [field]: val,
      },
    });
  };

  const toggleFwd = (enabled: boolean) => {
    if (!config.fwd.isApplicable) return;
    onChangeConfig({
      ...config,
      fwd: {
        ...config.fwd,
        enabled,
      },
    });
  };

  const handleTopologyChange = (newTopologyId: TopologyId) => {
    const nextTopology = TOPOLOGIES[newTopologyId];
    const isFwdApplicable =
      config.load.type !== 'R' &&
      nextTopology.fwdCapability.canHaveFwd &&
      !nextTopology.fwdCapability.naturalFreewheelingInherent;

    const reason = config.load.type === 'R'
      ? 'Not applicable: Purely resistive load does not store magnetic energy.'
      : nextTopology.fwdCapability.reasonWhenDisabled;

    onChangeConfig({
      ...config,
      topologyId: newTopologyId,
      controlled: {
        ...config.controlled,
        firingAngleDeg: nextTopology.defaultAlpha,
      },
      fwd: {
        enabled: isFwdApplicable ? config.fwd.enabled : false,
        isApplicable: isFwdApplicable,
        reasonIfNot: reason,
      },
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-200 space-y-6">
      {/* 1. Converter Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Converter Topology
          </label>
          <span className="text-xs text-slate-400">
            {currentTopology.phaseCount}-Phase · {currentTopology.isControlled ? 'Controlled' : 'Uncontrolled'}
          </span>
        </div>

        <select
          value={config.topologyId}
          onChange={(e) => handleTopologyChange(e.target.value as TopologyId)}
          aria-label="Converter Topology"
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
        >
          {CATEGORIES.map((cat) => (
            <optgroup key={cat.id} label={cat.name}>
              {Object.values(TOPOLOGIES)
                .filter((top) => top.category === cat.id)
                .map((top) => (
                  <option key={top.id} value={top.id}>
                    {top.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-slate-400 leading-relaxed">
          {currentTopology.shortDescription}
        </p>
      </div>

      {/* 2. Simulation Model: Ideal vs Practical */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            Simulation Mode
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-700">
            <button
              onClick={() => updatePractical('isPractical', false)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                !config.practical.isPractical
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ideal
            </button>
            <button
              onClick={() => updatePractical('isPractical', true)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                config.practical.isPractical
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Practical
            </button>
          </div>
        </div>

        {config.practical.isPractical ? (
          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs border-t border-slate-700/50">
            <div>
              <span className="text-slate-400">Diode Vf:</span>
              <span className="ml-1 text-amber-300 font-mono">{config.practical.diodeDrop}V</span>
            </div>
            <div>
              <span className="text-slate-400">SCR Von:</span>
              <span className="ml-1 text-amber-300 font-mono">{config.practical.scrDrop}V</span>
            </div>
            <div>
              <span className="text-slate-400">Device Ron:</span>
              <span className="ml-1 text-amber-300 font-mono">{config.practical.deviceRon}Ω</span>
            </div>
            <div>
              <span className="text-slate-400">Source Rs:</span>
              <span className="ml-1 text-amber-300 font-mono">{config.practical.sourceR}Ω</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Zero device forward voltage drop (Vf = 0), zero switch resistance, and ideal AC source.
          </p>
        )}
      </div>

      {/* 3. AC Supply Parameters */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-cyan-400" />
          AC Supply Parameters
        </span>

        {/* Voltage */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">
              {currentTopology.phaseCount === 3 ? 'Phase Voltage (Vph RMS)' : 'Supply Voltage (Vs RMS)'}
            </span>
            <span className="font-mono text-cyan-300 font-semibold">{config.supply.vRms} V</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="20"
              max="440"
              step="5"
              value={config.supply.vRms}
              onChange={(e) => updateSupply('vRms', parseFloat(e.target.value))}
              aria-label="Supply Voltage RMS"
              className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min="20"
              max="440"
              value={config.supply.vRms}
              onChange={(e) => updateSupply('vRms', Math.max(1, parseFloat(e.target.value) || 0))}
              aria-label="Supply Voltage RMS input"
              className="w-16 bg-slate-800 border border-slate-700 text-right px-2 py-1 rounded text-xs font-mono text-cyan-300"
            />
          </div>
          {currentTopology.phaseCount === 3 && (
            <p className="text-xs text-slate-400">
              Line-to-Line Voltage (V_LL): <span className="text-cyan-300 font-mono">{(config.supply.vRms * Math.sqrt(3)).toFixed(1)} V RMS</span>
            </p>
          )}
        </div>

        {/* Frequency */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Frequency (f)</span>
            <span className="font-mono text-cyan-300 font-semibold">{config.supply.frequency} Hz</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="25"
              max="400"
              step="5"
              value={config.supply.frequency}
              onChange={(e) => updateSupply('frequency', parseFloat(e.target.value))}
              aria-label="Supply Frequency"
              className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min="25"
              max="400"
              value={config.supply.frequency}
              onChange={(e) => updateSupply('frequency', Math.max(1, parseFloat(e.target.value) || 0))}
              aria-label="Supply Frequency input"
              className="w-16 bg-slate-800 border border-slate-700 text-right px-2 py-1 rounded text-xs font-mono text-cyan-300"
            />
          </div>
        </div>
      </div>

      {/* 4. Controlled Rectifier: Firing Angle (α) */}
      {currentTopology.isControlled && (
        <div className="space-y-3 bg-violet-950/20 border border-violet-800/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-violet-400" />
              Firing Angle Delay (α)
            </span>
            <span className="font-mono text-violet-300 font-bold text-sm bg-violet-900/60 px-2 py-0.5 rounded border border-violet-700/50">
              {config.controlled.firingAngleDeg}°
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="180"
              step="1"
              value={config.controlled.firingAngleDeg}
              onChange={(e) => updateControlled('firingAngleDeg', parseFloat(e.target.value))}
              aria-label="Firing Angle Alpha"
              className="flex-1 accent-violet-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min="0"
              max="180"
              value={config.controlled.firingAngleDeg}
              onChange={(e) => updateControlled('firingAngleDeg', Math.min(180, Math.max(0, parseFloat(e.target.value) || 0)))}
              aria-label="Firing Angle Alpha input"
              className="w-16 bg-slate-800 border border-violet-700/60 text-right px-2 py-1 rounded text-xs font-mono text-violet-300"
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>0° (Diode Mode)</span>
            <span>90° (Boundary)</span>
            <span>180° (Full Retard)</span>
          </div>

          {config.controlled.firingAngleDeg > 90 && config.load.type === 'RLE' && (
            <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 p-2 rounded">
              Two-quadrant inverter mode: With active DC back EMF and α &gt; 90°, average voltage is negative, feeding power back into AC mains.
            </p>
          )}
        </div>
      )}

      {/* 5. Load Configuration */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Load Configuration
        </span>

        {/* Load Type Selector */}
        <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          {(['R', 'RL', 'RLE'] as LoadType[]).map((lType) => (
            <button
              key={lType}
              onClick={() => updateLoad('type', lType)}
              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                config.load.type === lType
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lType === 'R' ? 'R (Resistive)' : lType === 'RL' ? 'R + L' : 'R + L + E'}
            </button>
          ))}
        </div>

        {/* Resistance */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Resistance (R)</span>
            <span className="font-mono text-emerald-300 font-semibold">{config.load.r} Ω</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="150"
              step="1"
              value={config.load.r}
              onChange={(e) => updateLoad('r', parseFloat(e.target.value))}
              aria-label="Load Resistance R"
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <input
              type="number"
              min="1"
              max="150"
              value={config.load.r}
              onChange={(e) => updateLoad('r', Math.max(0.1, parseFloat(e.target.value) || 0))}
              aria-label="Load Resistance R input"
              className="w-16 bg-slate-800 border border-slate-700 text-right px-2 py-1 rounded text-xs font-mono text-emerald-300"
            />
          </div>
        </div>

        {/* Inductance (RL or RLE) */}
        {config.load.type !== 'R' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Inductance (L)</span>
              <span className="font-mono text-emerald-300 font-semibold">
                {(config.load.l * 1000).toFixed(0)} mH ({config.load.l.toFixed(3)} H)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.005"
                max="0.25"
                step="0.005"
                value={config.load.l}
                onChange={(e) => updateLoad('l', parseFloat(e.target.value))}
                aria-label="Load Inductance L"
                className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <input
                type="number"
                min="5"
                max="250"
                value={(config.load.l * 1000).toFixed(0)}
                onChange={(e) => updateLoad('l', Math.max(0.001, (parseFloat(e.target.value) || 0) / 1000))}
                aria-label="Load Inductance L input in mH"
                className="w-16 bg-slate-800 border border-slate-700 text-right px-2 py-1 rounded text-xs font-mono text-emerald-300"
              />
            </div>
            <span className="text-xs text-slate-400">
              Load time constant τ = L/R = {(config.load.l / Math.max(config.load.r, 0.1) * 1000).toFixed(1)} ms
            </span>
          </div>
        )}

        {/* Back EMF (RLE) */}
        {config.load.type === 'RLE' && (
          <div className="space-y-1.5 bg-amber-950/20 border border-amber-800/40 p-2.5 rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-amber-300 font-medium">DC Back EMF / Battery (E)</span>
              <span className="font-mono text-amber-300 font-semibold">{config.load.e} V</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={config.load.e}
                onChange={(e) => updateLoad('e', parseFloat(e.target.value))}
                aria-label="DC Back EMF E"
                className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <input
                type="number"
                min="0"
                max="200"
                value={config.load.e}
                onChange={(e) => updateLoad('e', Math.max(0, parseFloat(e.target.value) || 0))}
                aria-label="DC Back EMF E input"
                className="w-16 bg-slate-800 border border-slate-700 text-right px-2 py-1 rounded text-xs font-mono text-amber-300"
              />
            </div>
            <p className="text-xs text-slate-400">
              Models DC motor armature back-EMF (E = k_e · ω) or battery charging potential. Conduction requires source voltage &gt; E.
            </p>
          </div>
        )}
      </div>

      {/* 6. Freewheeling Diode (FWD) - Topology-Aware Logic */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Freewheeling Diode (FWD)</span>
          </div>
          {config.fwd.isApplicable ? (
            <button
              onClick={() => toggleFwd(!config.fwd.enabled)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                config.fwd.enabled
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              {config.fwd.enabled ? 'Enabled' : 'Disabled'}
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Not Applicable
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {config.fwd.isApplicable
            ? config.fwd.enabled
              ? 'FWD branch is actively connected across load. Clamps negative voltage spikes, circulates inductor energy, and protects supply switches.'
              : 'FWD is disabled. Stored inductive energy may force output voltage negative during AC reversal.'
            : config.fwd.reasonIfNot}
        </p>
      </div>
    </div>
  );
};
