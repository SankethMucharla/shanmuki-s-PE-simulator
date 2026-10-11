/**
 * RectifierLab - Power Electronics Virtual Laboratory
 * Comprehensive interactive simulator for uncontrolled, controlled, multipulse rectifiers and choppers.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SimulationConfig,
  SimulationResult,
} from './types/circuit';
import { runCompleteSimulation } from './simulation/simulationRunner';
import { Header, ActiveTab } from './components/Header';
import { ParameterControls } from './components/Controls/ParameterControls';
import { CircuitSchematic } from './components/Schematic/CircuitSchematic';
import { OscilloscopeViewer } from './components/Waveforms/OscilloscopeViewer';
import { MeasurementDashboard } from './components/Dashboard/MeasurementDashboard';
import { PowerQualityPanel } from './components/Dashboard/PowerQualityPanel';
import { TheoryComparisonTable } from './components/Dashboard/TheoryComparisonTable';
import { ConverterComparisonLab } from './components/ComparisonLab/ConverterComparisonLab';
import { TheoryEncyclopedia } from './components/Theory/TheoryEncyclopedia';
import { SavedExperimentsModal } from './components/Experiments/SavedExperimentsModal';
import { ExportModal } from './components/Export/ExportModal';

const DEFAULT_CONFIG: SimulationConfig = {
  topologyId: '1ph_fw_bridge',
  supply: {
    vRms: 230,
    frequency: 50,
    phaseOffsetDeg: 0,
    rs: 0,
    ls: 0,
  },
  load: {
    type: 'RL',
    r: 20,
    l: 0.05, // 50 mH
    e: 0,
    initialCurrent: 0,
  },
  controlled: {
    firingAngleDeg: 45,
    pulseWidthDeg: 10,
    pulseAmpV: 5,
  },
  practical: {
    isPractical: false,
    diodeDrop: 0.8,
    scrDrop: 1.2,
    deviceRon: 0.05,
    sourceR: 0.2,
  },
  fwd: {
    enabled: false,
    isApplicable: true,
    reasonIfNot: '',
  },
  cyclesToSimulate: 4,
  pointsPerCycle: 1000,
};

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');

  // Animation / Time Cursor playback state
  const [currentIndex, setCurrentIndex] = useState(250); // Start mid-first cycle
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x normal speed

  // Modals state
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Authoritative mathematical simulation result
  const result: SimulationResult = useMemo(() => {
    return runCompleteSimulation(config);
  }, [config]);

  // Keep index within valid bounds when points array changes
  useEffect(() => {
    if (currentIndex >= result.points.length) {
      setCurrentIndex(0);
    }
  }, [result.points.length, currentIndex]);

  // Real-time animation loop using requestAnimationFrame
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const deltaMs = timestamp - lastTimeRef.current;
        // Normal speed: 1 electrical cycle (20ms at 50Hz) plays across ~2 seconds for human observation (100x slow-mo)
        const stepIncrement = Math.max(1, Math.round((deltaMs / 20) * 10 * playbackSpeed));

        setCurrentIndex((prev) => {
          const next = prev + stepIncrement;
          return next >= result.points.length ? 0 : next;
        });
      }
      lastTimeRef.current = timestamp;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, result.points.length]);

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setCurrentIndex(250);
  };

  const currentPoint = result.points[currentIndex] || result.points[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onResetSimulation={handleReset}
        isSimulating={isPlaying}
        onToggleSimulating={() => setIsPlaying(!isPlaying)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: SIMULATOR & WORKSPACE */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Top Workspace Grid: Controls (Left) + Schematic & Scope (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Panel: Parameter Controls (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                <ParameterControls
                  config={config}
                  onChangeConfig={(newCfg) => setConfig(newCfg)}
                />
              </div>

              {/* Right Panel: Electrical Schematic + Oscilloscope (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Circuit Schematic with Conduction Animation */}
                <CircuitSchematic
                  config={config}
                  currentPoint={currentPoint}
                />

                {/* Oscilloscope Waveform Viewer */}
                <OscilloscopeViewer
                  config={config}
                  points={result.points}
                  currentIndex={currentIndex}
                  onSelectIndex={(idx) => setCurrentIndex(idx)}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  playbackSpeed={playbackSpeed}
                  onChangeSpeed={(spd) => setPlaybackSpeed(spd)}
                />
              </div>
            </div>

            {/* Bottom Panels: Steady-State Measurements & Theory Comparison */}
            <div className="space-y-6">
              <MeasurementDashboard
                metrics={result.metrics}
                config={config}
              />

              <TheoryComparisonTable
                comparison={result.comparison}
                theoretical={result.theoretical}
              />
            </div>
          </div>
        )}

        {/* TAB 2: CONVERTER COMPARISON LAB */}
        {activeTab === 'comparison' && (
          <ConverterComparisonLab baseConfig={config} />
        )}

        {/* TAB 3: POWER QUALITY & FFT HARMONICS */}
        {activeTab === 'power_quality' && (
          <div className="space-y-6">
            <PowerQualityPanel
              harmonics={result.harmonics}
              metrics={result.metrics}
              config={config}
            />

            <OscilloscopeViewer
              config={config}
              points={result.points}
              currentIndex={currentIndex}
              onSelectIndex={(idx) => setCurrentIndex(idx)}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              playbackSpeed={playbackSpeed}
              onChangeSpeed={(spd) => setPlaybackSpeed(spd)}
            />
          </div>
        )}

        {/* TAB 4: THEORY ENCYCLOPEDIA */}
        {activeTab === 'theory' && (
          <TheoryEncyclopedia />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          24EE10066 Shanmuki Sai Durga · Power Electronics Virtual Laboratory · Rigorous Runge-Kutta 4th Order Time-Domain Simulation Engine
        </p>
      </footer>

      {/* Modals */}
      <SavedExperimentsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onLoadExperiment={(loadedCfg) => {
          setConfig(loadedCfg);
          setCurrentIndex(0);
        }}
        currentConfig={config}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        result={result}
      />
    </div>
  );
}
