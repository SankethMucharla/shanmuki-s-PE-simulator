import React from 'react';
import { CircuitMetrics, SimulationConfig } from '../../types/circuit';
import {
  Gauge,
  Zap,
  Activity,
  Flame,
  Scale,
  Percent,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface MeasurementDashboardProps {
  metrics: CircuitMetrics;
  config: SimulationConfig;
}

export const MeasurementDashboard: React.FC<MeasurementDashboardProps> = ({
  metrics,
  config,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-200 space-y-5">
      {/* Dashboard Section Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Steady-State Measurement Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
              metrics.conductionMode === 'CCM'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
            }`}
          >
            {metrics.conductionMode === 'CCM' ? (
              <CheckCircle className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            )}
            Conduction: {metrics.conductionMode === 'CCM' ? 'Continuous (CCM)' : 'Discontinuous (DCM)'}
          </span>
          {metrics.extinctionAngleBetaDeg !== undefined && (
            <span className="text-xs text-amber-400 font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              β = {metrics.extinctionAngleBetaDeg.toFixed(1)}°
            </span>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (6 key laboratory cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Vo Avg */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Vo (DC Average)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-400">
            {metrics.voAvg.toFixed(2)} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-400">Useful DC output</div>
        </div>

        {/* Vo RMS */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Vo (Total RMS)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
            {metrics.voRms.toFixed(2)} <span className="text-xs font-normal text-slate-400">V</span>
          </div>
          <div className="text-[10px] text-slate-400">True effective voltage</div>
        </div>

        {/* Io Avg */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Io (DC Average)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {metrics.ioAvg.toFixed(2)} <span className="text-xs font-normal text-slate-400">A</span>
          </div>
          <div className="text-[10px] text-slate-400">Average load current</div>
        </div>

        {/* Io RMS */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Io (Load RMS)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
            {metrics.ioRms.toFixed(2)} <span className="text-xs font-normal text-slate-400">A</span>
          </div>
          <div className="text-[10px] text-slate-400">Thermal heating current</div>
        </div>

        {/* DC Output Power */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">P_dc (Power)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-cyan-400">
            {metrics.pDc.toFixed(1)} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
          <div className="text-[10px] text-slate-400">Vo_avg · Io_avg</div>
        </div>

        {/* Rectification Efficiency */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Efficiency (η)</div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {metrics.efficiencyPercent.toFixed(1)} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400">P_out / P_in</div>
        </div>
      </div>

      {/* Detailed Technical Metrics Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
            <tr>
              <th className="py-2 px-3">Performance Parameter</th>
              <th className="py-2 px-3">Symbol</th>
              <th className="py-2 px-3">Formula / Definition</th>
              <th className="py-2 px-3 font-mono">Simulated Value</th>
              <th className="py-2 px-3">Physical Engineering Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            <tr>
              <td className="py-2 px-3 font-medium text-white">Voltage Form Factor</td>
              <td className="py-2 px-3 font-mono text-amber-300">FF</td>
              <td className="py-2 px-3 font-mono text-slate-400">Vo_rms / Vo_avg</td>
              <td className="py-2 px-3 font-mono font-bold text-amber-400">
                {metrics.formFactor.toFixed(3)}
              </td>
              <td className="py-2 px-3 text-slate-400">
                Measures deviation from ideal flat DC (FF = 1.0 represents pure DC).
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Voltage Ripple Factor</td>
              <td className="py-2 px-3 font-mono text-amber-300">RF_v</td>
              <td className="py-2 px-3 font-mono text-slate-400">√(FF² - 1)</td>
              <td className="py-2 px-3 font-mono font-bold text-amber-400">
                {(metrics.voltageRippleFactor * 100).toFixed(1)}% ({metrics.voltageRippleFactor.toFixed(3)})
              </td>
              <td className="py-2 px-3 text-slate-400">
                Ratio of residual AC ripple voltage to average DC output.
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Current Ripple Factor</td>
              <td className="py-2 px-3 font-mono text-emerald-300">RF_i</td>
              <td className="py-2 px-3 font-mono text-slate-400">√((Io_rms/Io_avg)² - 1)</td>
              <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                {(metrics.currentRippleFactor * 100).toFixed(1)}% ({metrics.currentRippleFactor.toFixed(3)})
              </td>
              <td className="py-2 px-3 text-slate-400">
                Load current pulsation. Lower value implies smoother motor torque.
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Peak Load Current</td>
              <td className="py-2 px-3 font-mono text-emerald-300">Io_peak</td>
              <td className="py-2 px-3 font-mono text-slate-400">max( io(t) )</td>
              <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                {metrics.ioPeak.toFixed(2)} A
              </td>
              <td className="py-2 px-3 text-slate-400">
                Determines semiconductor switch peak repetitive current rating.
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Input Source Current RMS</td>
              <td className="py-2 px-3 font-mono text-pink-300">Is_rms</td>
              <td className="py-2 px-3 font-mono text-slate-400">√( 1/T · ∫ is² dt )</td>
              <td className="py-2 px-3 font-mono font-bold text-pink-400">
                {metrics.isRms.toFixed(2)} A
              </td>
              <td className="py-2 px-3 text-slate-400">
                Draws AC mains current used for transformer sizing & cable selection.
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Input Active Power</td>
              <td className="py-2 px-3 font-mono text-cyan-300">P_in</td>
              <td className="py-2 px-3 font-mono text-slate-400">1/T · ∫ (vs · is) dt</td>
              <td className="py-2 px-3 font-mono font-bold text-cyan-400">
                {metrics.pInActive.toFixed(1)} W
              </td>
              <td className="py-2 px-3 text-slate-400">
                Real electrical power drawn from the AC source grid.
              </td>
            </tr>

            <tr>
              <td className="py-2 px-3 font-medium text-white">Peak Inverse Voltage</td>
              <td className="py-2 px-3 font-mono text-red-300">PIV</td>
              <td className="py-2 px-3 font-mono text-slate-400">max( |v_reverse| )</td>
              <td className="py-2 px-3 font-mono font-bold text-red-400">
                {metrics.peakInverseVoltage.toFixed(1)} V
              </td>
              <td className="py-2 px-3 text-slate-400">
                Minimum reverse blocking voltage devices must withstand without avalanche.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
