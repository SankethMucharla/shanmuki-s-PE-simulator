import React from 'react';
import { Zap, Play, RotateCcw, Download, BookOpen, Layers, BarChart3, Sliders } from 'lucide-react';

export type ActiveTab = 'simulator' | 'comparison' | 'power_quality' | 'theory';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenPresets: () => void;
  onOpenExport: () => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
  onToggleSimulating: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenPresets,
  onOpenExport,
  onResetSimulation,
  isSimulating,
  onToggleSimulating,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            24EE10066 Shanmuki Sai Durga
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 border-l border-slate-700 pl-2.5">
            Power Electronics Virtual Laboratory
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Simulator & Schematics
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Comparison Lab
          </button>

          <button
            onClick={() => setActiveTab('power_quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'power_quality'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Power Quality & FFT
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'theory'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Theory Guide
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenPresets}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
            title="Load classical laboratory experiments"
          >
            Experiments
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
            title="Export simulation data as CSV or JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onResetSimulation}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
            title="Reset circuit parameters to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 px-2 py-1.5 bg-slate-900/95 overflow-x-auto">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-2.5 py-1 text-xs whitespace-nowrap rounded ${
            activeTab === 'simulator' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Simulator
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-2.5 py-1 text-xs whitespace-nowrap rounded ${
            activeTab === 'comparison' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Comparison
        </button>
        <button
          onClick={() => setActiveTab('power_quality')}
          className={`px-2.5 py-1 text-xs whitespace-nowrap rounded ${
            activeTab === 'power_quality' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Power Quality
        </button>
        <button
          onClick={() => setActiveTab('theory')}
          className={`px-2.5 py-1 text-xs whitespace-nowrap rounded ${
            activeTab === 'theory' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          Theory
        </button>
      </div>
    </header>
  );
};
