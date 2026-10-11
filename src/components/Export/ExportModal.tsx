import React, { useState } from 'react';
import { SimulationResult } from '../../types/circuit';
import { Download, Copy, Check, X, FileText, Table } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SimulationResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'report'>('csv');

  if (!isOpen) return null;

  // Generate CSV text
  const generateCsv = () => {
    const headers = [
      'time_s',
      'theta_deg',
      'vs_V',
      'vo_V',
      'io_A',
      'is_A',
      'ifwd_A',
      'active_devices',
      'conduction_mode',
    ].join(',');

    const rows = result.points.map((p) =>
      [
        p.time.toFixed(6),
        p.thetaDeg.toFixed(2),
        p.vs.toFixed(3),
        p.vo.toFixed(3),
        p.io.toFixed(4),
        p.is.toFixed(4),
        p.iFwd.toFixed(4),
        `"${p.activeDevices.join(';')}"`,
        p.conductionMode,
      ].join(',')
    );

    return [headers, ...rows].join('\n');
  };

  // Generate JSON
  const generateJson = () => {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        topology: result.config.topologyId,
        config: result.config,
        metrics: result.metrics,
        harmonics: result.harmonics,
        sampleCount: result.points.length,
      },
      null,
      2
    );
  };

  // Generate Laboratory Report Text
  const generateReport = () => {
    return `========================================================================
24EE10066 SHANMUKI SAI DURGA - POWER ELECTRONICS VIRTUAL LABORATORY
Topology: ${result.config.topologyId}
Generated: ${new Date().toLocaleString()}
========================================================================

1. OPERATING PARAMETERS:
   - AC Supply Voltage: ${result.config.supply.vRms} V RMS, ${result.config.supply.frequency} Hz
   - Load Type: ${result.config.load.type} Load
   - Load Resistance: ${result.config.load.r} Ohms
   - Load Inductance: ${(result.config.load.l * 1000).toFixed(1)} mH
   - Back EMF: ${result.config.load.e} V
   - Firing Angle (alpha): ${result.config.controlled.firingAngleDeg} deg
   - Freewheeling Diode: ${result.config.fwd.enabled ? 'ENABLED' : 'DISABLED'}
   - Simulation Model: ${result.config.practical.isPractical ? 'PRACTICAL' : 'IDEAL'}

2. STEADY-STATE MEASUREMENT RESULTS:
   - Average DC Output Voltage (Vo_avg): ${result.metrics.voAvg.toFixed(2)} V
   - RMS Output Voltage (Vo_rms): ${result.metrics.voRms.toFixed(2)} V
   - Average Load Current (Io_avg): ${result.metrics.ioAvg.toFixed(2)} A
   - RMS Load Current (Io_rms): ${result.metrics.ioRms.toFixed(2)} A
   - Peak Load Current (Io_peak): ${result.metrics.ioPeak.toFixed(2)} A
   - Voltage Ripple Factor: ${(result.metrics.voltageRippleFactor * 100).toFixed(1)} %
   - Voltage Form Factor: ${result.metrics.formFactor.toFixed(3)}
   - Useful DC Output Power (P_dc): ${result.metrics.pDc.toFixed(1)} W
   - Rectification Efficiency: ${result.metrics.efficiencyPercent.toFixed(1)} %
   - Conduction Mode: ${result.metrics.conductionMode}
   ${result.metrics.extinctionAngleBetaDeg ? `- Extinction Angle (beta): ${result.metrics.extinctionAngleBetaDeg.toFixed(1)} deg` : ''}

3. POWER QUALITY & HARMONICS:
   - True Power Factor (PF): ${result.harmonics.truePowerFactor.toFixed(3)}
   - Displacement Factor (DPF): ${result.harmonics.displacementFactor.toFixed(3)}
   - Current Distortion Factor (DF): ${result.harmonics.distortionFactor.toFixed(3)}
   - Current Total Harmonic Distortion (THD_i): ${result.harmonics.thdCurrentPercent.toFixed(1)} %
   - Fundamental Input Current RMS: ${result.harmonics.fundamentalRms.toFixed(2)} A

4. THEORETICAL BENCHMARK COMPARISON:
   - Theoretical Vo_avg: ${result.theoretical.voAvg.toFixed(2)} V
   - Simulated Vo_avg: ${result.metrics.voAvg.toFixed(2)} V
   - Formula: ${result.theoretical.formulaVoAvg}

========================================================================`;
  };

  const getExportData = () => {
    if (exportFormat === 'csv') return generateCsv();
    if (exportFormat === 'json') return generateJson();
    return generateReport();
  };

  const handleDownload = () => {
    const data = getExportData();
    const mime =
      exportFormat === 'csv'
        ? 'text/csv'
        : exportFormat === 'json'
        ? 'application/json'
        : 'text/plain';
    const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'json' ? 'json' : 'txt';
    const filename = `rectifier_simulation_${result.config.topologyId}_${Date.now()}.${ext}`;

    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const data = getExportData();
    navigator.clipboard.writeText(data).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col text-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Export Simulation Data & Laboratory Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Format Selector */}
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setExportFormat('csv')}
              className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                exportFormat === 'csv'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              CSV Waveform Time-Series ({result.points.length} points)
            </button>
            <button
              onClick={() => setExportFormat('report')}
              className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                exportFormat === 'report'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Lab Report Text
            </button>
            <button
              onClick={() => setExportFormat('json')}
              className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                exportFormat === 'json'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              JSON Raw Configuration
            </button>
          </div>

          {/* Preview Box */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Data Preview
            </span>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 h-64 overflow-auto whitespace-pre leading-relaxed">
              {getExportData().slice(0, 3000)}
              {getExportData().length > 3000 && '\n... [Remaining data truncated in preview]'}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
