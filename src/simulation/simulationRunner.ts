/**
 * Simulation Runner & Master Orchestrator
 * Runs the time-domain circuit simulation, extracts steady-state intervals,
 * and attaches numerical metrics, harmonic analysis, and theoretical verification.
 */

import {
  SimulationConfig,
  SimulationResult,
} from '../types/circuit';
import { runCircuitSimulation } from './mathEngine';
import { computeCircuitMetrics } from './measurements';
import { computeHarmonicAnalysis } from './harmonicAnalysis';
import {
  calculateTheoreticalValues,
  generateTheoryComparison,
} from './theoreticalCalculations';

export function runCompleteSimulation(config: SimulationConfig): SimulationResult {
  // 1. Time-domain simulation
  const { points, steadyStateStartIndex } = runCircuitSimulation(config);

  // 2. Extract steady-state portion (cycles 2 to end)
  const steadyPoints = points.slice(steadyStateStartIndex);

  // 3. Steady-state circuit metrics
  const metrics = computeCircuitMetrics(steadyPoints, config.topologyId);

  // 4. Harmonics & Power Quality FFT
  const harmonics = computeHarmonicAnalysis(
    steadyPoints,
    config.supply.frequency,
    config.supply.vRms,
    metrics.isRms,
    metrics.pInActive
  );

  // Attach power factor to metrics
  // metrics.truePowerFactor = harmonics.truePowerFactor;

  // 5. Theoretical calculations
  const theoretical = calculateTheoreticalValues(config);

  // 6. Theory vs. Simulation comparison table
  const comparison = generateTheoryComparison(theoretical, metrics);

  return {
    config,
    points,
    steadyStateStartIndex,
    metrics,
    harmonics,
    theoretical,
    comparison,
  };
}
