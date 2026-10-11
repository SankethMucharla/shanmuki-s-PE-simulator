import React from 'react';
import { TheoryComparisonItem, TheoreticalResult } from '../../types/circuit';
import { Scale, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface TheoryComparisonTableProps {
  comparison: TheoryComparisonItem[];
  theoretical: TheoreticalResult;
}

export const TheoryComparisonTable: React.FC<TheoryComparisonTableProps> = ({
  comparison,
  theoretical,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-200 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Theory vs. Numerical Simulation Verification
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Independent analytical formulas benchmarked against time-domain integration
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-3">Electrical Parameter</th>
              <th className="py-2.5 px-3">Analytical Formula</th>
              <th className="py-2.5 px-3 font-mono text-cyan-300">Theoretical</th>
              <th className="py-2.5 px-3 font-mono text-emerald-300">Simulated</th>
              <th className="py-2.5 px-3 font-mono">Discrepancy Error</th>
              <th className="py-2.5 px-3">Engineering Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {comparison.map((item, idx) => {
              const isLowError = item.errorPercent < 3.0;
              const isModerate = item.errorPercent >= 3.0 && item.errorPercent < 8.0;

              return (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white whitespace-nowrap">
                    {item.parameter}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {item.formula}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                    {item.theoretical.toFixed(2)} {item.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-300 whitespace-nowrap">
                    {item.simulated.toFixed(2)} {item.unit}
                  </td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isLowError
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : isModerate
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : 'bg-red-950/60 text-red-400 border border-red-800/60'
                      }`}
                    >
                      {item.errorPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] leading-relaxed min-w-[200px]">
                    {item.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Assumptions Callout */}
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 text-xs space-y-1.5">
        <div className="text-slate-300 font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          Analytical Mathematical Assumptions:
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
          {theoretical.assumptions.map((assump, aIdx) => (
            <li key={aIdx}>{assump}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
