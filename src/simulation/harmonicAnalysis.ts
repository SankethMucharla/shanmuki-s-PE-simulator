/**
 * Power Quality & Harmonic Fourier Analysis (FFT)
 * Computes fundamental displacement factor, distortion factor, true power factor,
 * THD, and harmonic spectra from simulated steady-state time domain waveforms.
 */

import {
  SimulationTimePoint,
  HarmonicAnalysisResult,
  HarmonicComponent,
} from '../types/circuit';

export function computeHarmonicAnalysis(
  steadyPoints: SimulationTimePoint[],
  frequency: number,
  vsRms: number,
  isRms: number,
  activePowerIn: number
): HarmonicAnalysisResult {
  if (steadyPoints.length < 10 || isRms < 1e-4) {
    return {
      fundamentalRms: 0,
      fundamentalPhaseDeg: 0,
      displacementFactor: 1,
      distortionFactor: 1,
      truePowerFactor: 0,
      thdCurrentPercent: 0,
      harmonics: [],
    };
  }

  const N = steadyPoints.length;
  const maxHarmonic = 25;
  const harmonics: HarmonicComponent[] = [];

  // Compute Fourier coefficients for each harmonic h = 1..25
  // a_h = (2/N) * sum( i_s[n] * cos(h * theta[n]) )
  // b_h = (2/N) * sum( i_s[n] * sin(h * theta[n]) )
  let a1 = 0;
  let b1 = 0;

  for (let h = 1; h <= maxHarmonic; h++) {
    let sumCos = 0;
    let sumSin = 0;

    for (let n = 0; n < N; n++) {
      const pt = steadyPoints[n];
      const theta = pt.thetaRad;
      sumCos += pt.is * Math.cos(h * theta);
      sumSin += pt.is * Math.sin(h * theta);
    }

    const ah = (2 / N) * sumCos;
    const bh = (2 / N) * sumSin;
    const magnitude = Math.sqrt(ah * ah + bh * bh);
    const rms = magnitude / Math.SQRT2;
    const phaseRad = Math.atan2(ah, bh);

    if (h === 1) {
      a1 = ah;
      b1 = bh;
    }

    harmonics.push({
      harmonic: h,
      frequencyHz: h * frequency,
      magnitude,
      rms,
      percentageOfFundamental: 0, // calculated below
      phaseRad,
    });
  }

  const fundamentalPeak = harmonics[0].magnitude;
  const fundamentalRms = harmonics[0].rms;
  const fundamentalPhaseRad = harmonics[0].phaseRad;
  const fundamentalPhaseDeg = (fundamentalPhaseRad * 180) / Math.PI;

  // Normalize harmonic percentages relative to fundamental
  for (const h of harmonics) {
    h.percentageOfFundamental = fundamentalRms > 1e-5 ? (h.rms / fundamentalRms) * 100 : 0;
  }

  // Displacement Power Factor: cos(phi1) where phi1 is angle between fundamental vs and is
  // Note: vs is reference sin(omega * t) -> phase 0
  const displacementFactor = Math.abs(Math.cos(fundamentalPhaseRad));

  // Current Distortion Factor: I1_rms / Is_rms
  const distortionFactor = isRms > 1e-5 ? Math.min(1, fundamentalRms / isRms) : 1;

  // True Power Factor: P_in / (Vs_rms * Is_rms) = DPF * DF
  const apparentPower = vsRms * isRms;
  let truePowerFactor = apparentPower > 1e-3 ? Math.abs(activePowerIn / apparentPower) : 0;
  if (truePowerFactor > 1) truePowerFactor = 1;

  // Total Harmonic Distortion of Current (THD_i)
  // THD = sqrt(Is_rms^2 - I1_rms^2) / I1_rms * 100%
  let thdCurrentPercent = 0;
  if (fundamentalRms > 1e-5 && isRms >= fundamentalRms) {
    const harmonicRmsSq = Math.max(0, isRms * isRms - fundamentalRms * fundamentalRms);
    thdCurrentPercent = (Math.sqrt(harmonicRmsSq) / fundamentalRms) * 100;
  }

  return {
    fundamentalRms,
    fundamentalPhaseDeg,
    displacementFactor,
    distortionFactor,
    truePowerFactor,
    thdCurrentPercent,
    harmonics,
  };
}
