import React from 'react';
import {
  HarmonicAnalysisResult,
  CircuitMetrics,
  SimulationConfig,
} from '../../types/circuit';
import { BarChart3, Activity, Zap, ShieldCheck, Info } from 'lucide-react';

interface PowerQualityPanelProps {
  harmonics: HarmonicAnalysisResult;
  metrics: CircuitMetrics;
  config: SimulationConfig;
}

export const PowerQualityPanel: React.FC<PowerQualityPanelProps> = ({
  harmonics,
  metrics,
  config,
}) => {
  const apparentPower = config.supply.vRms * metrics.isRms;
  const reactivePower = Math.sqrt(Math.max(0, apparentPower * apparentPower - metrics.pInActive * metrics.pInActive));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-200 space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Power Quality & AC Harmonics Analysis (FFT)
          </h2>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
          <span>THD_i: <strong className="text-amber-400 font-bold">{harmonics.thdCurrentPercent.toFixed(1)}%</strong></span>
          <span>·</span>
          <span>True PF: <strong className="text-cyan-400 font-bold">{harmonics.truePowerFactor.toFixed(3)}</strong></span>
        </div>
      </div>

      {/* Power Factor Equation Decomposition Callout */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-xs space-y-2">
        <div className="text-slate-300 font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          True Power Factor Decomposition (Sinusoidal AC Supply):
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm bg-slate-900/90 p-2.5 rounded border border-slate-800">
          <div className="text-cyan-300 font-bold">
            PF = <span className="text-white">{(harmonics.truePowerFactor).toFixed(3)}</span>
          </div>
          <span className="text-slate-500">=</span>
          <div className="text-emerald-300">
            DPF <span className="text-xs text-slate-400">(cos φ₁)</span>: <span className="text-white">{(harmonics.displacementFactor).toFixed(3)}</span>
          </div>
          <span className="text-slate-500">×</span>
          <div className="text-amber-300">
            DF <span className="text-xs text-slate-400">(I₁ / Is)</span>: <span className="text-white">{(harmonics.distortionFactor).toFixed(3)}</span>
          </div>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          In non-linear rectifiers, True Power Factor is the product of Displacement Factor (caused by firing delay angle α and load inductance) and Distortion Factor (caused by non-sinusoidal switching currents).
        </p>
      </div>

      {/* Grid of Power Quality Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* True PF */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">True Power Factor (PF)</div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {harmonics.truePowerFactor.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400">P_in / (Vs · Is)</div>
        </div>

        {/* Displacement PF */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Displacement Factor (DPF)</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {harmonics.displacementFactor.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400">cos(φ₁) = cos({harmonics.fundamentalPhaseDeg.toFixed(1)}°)</div>
        </div>

        {/* Distortion Factor */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Distortion Factor (DF)</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {harmonics.distortionFactor.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400">I_fundamental / I_total</div>
        </div>

        {/* Current THD */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Current THD (THD_i)</div>
          <div className="text-xl font-bold font-mono text-pink-400">
            {harmonics.thdCurrentPercent.toFixed(1)} <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-400">IEEE 519 target &lt; 5%</div>
        </div>

        {/* Apparent Power S */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Apparent Power (S)</div>
          <div className="text-lg font-bold font-mono text-slate-200">
            {apparentPower.toFixed(1)} <span className="text-xs font-normal text-slate-400">VA</span>
          </div>
          <div className="text-[10px] text-slate-400">Vs_rms · Is_rms</div>
        </div>

        {/* Active Power P */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Active Real Power (P)</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {metrics.pInActive.toFixed(1)} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
          <div className="text-[10px] text-slate-400">True active energy</div>
        </div>

        {/* Reactive Power Q */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Reactive Power (Q)</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {reactivePower.toFixed(1)} <span className="text-xs font-normal text-slate-400">VAR</span>
          </div>
          <div className="text-[10px] text-slate-400">√(S² - P²)</div>
        </div>

        {/* Fundamental RMS */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Fundamental RMS (I₁_rms)</div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {harmonics.fundamentalRms.toFixed(2)} <span className="text-xs font-normal text-slate-400">A</span>
          </div>
          <div className="text-[10px] text-slate-400">50/60 Hz component</div>
        </div>
      </div>

      {/* FFT Harmonic Spectrum Bar Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span>Input Current Harmonic Spectrum (h = 1 to 25)</span>
          <span className="text-slate-400 font-normal">Values normalized to fundamental (h=1 = 100%)</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 pt-6 pb-2 border-b border-slate-800">
            {harmonics.harmonics.slice(0, 15).map((h) => {
              const heightPercent = Math.min(100, Math.max(3, h.percentageOfFundamental));
              const isFundamental = h.harmonic === 1;
              const isSignificant = h.percentageOfFundamental > 5;

              return (
                <div
                  key={h.harmonic}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-mono px-2 py-1 rounded border border-slate-700 pointer-events-none z-10 whitespace-nowrap shadow-lg">
                    h={h.harmonic} ({h.frequencyHz}Hz): {h.percentageOfFundamental.toFixed(1)}% ({h.rms.toFixed(2)}A)
                  </div>

                  {/* Percentage label above significant bars */}
                  {isSignificant && (
                    <span className="text-[9px] font-mono text-slate-400 mb-1">
                      {h.percentageOfFundamental.toFixed(0)}%
                    </span>
                  )}

                  {/* Vertical Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-all duration-300 ${
                      isFundamental
                        ? 'bg-cyan-500 hover:bg-cyan-400'
                        : isSignificant
                        ? 'bg-pink-500 hover:bg-pink-400'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Harmonic Axis Labels */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-center font-mono text-[10px] text-slate-400">
            {harmonics.harmonics.slice(0, 15).map((h) => (
              <div key={h.harmonic} className="flex-1">
                h{h.harmonic}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
