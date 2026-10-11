/**
 * Circuit Measurements Engine
 * Numerically integrates simulated waveforms over steady-state integer cycles.
 */

import {
  SimulationTimePoint,
  CircuitMetrics,
  TopologyId,
} from '../types/circuit';

export function computeCircuitMetrics(
  steadyPoints: SimulationTimePoint[],
  topologyId: TopologyId
): CircuitMetrics {
  if (steadyPoints.length === 0) {
    return {
      voAvg: 0,
      voRms: 0,
      ioAvg: 0,
      ioRms: 0,
      ioPeak: 0,
      isRms: 0,
      pDc: 0,
      pOutActive: 0,
      pInActive: 0,
      efficiencyPercent: 0,
      formFactor: 1,
      voltageRippleFactor: 0,
      currentRippleFactor: 0,
      conductionMode: 'CCM',
      peakInverseVoltage: 0,
    };
  }

  const N = steadyPoints.length;
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let maxIo = 0;
  let sumIsSq = 0;
  let sumPIn = 0;
  let sumPOut = 0;
  let minDeviceV = 0;

  // Track zero current for DCM detection
  let zeroCurrentCount = 0;
  let extinctionAngleBetaDeg: number | undefined = undefined;

  for (let i = 0; i < N; i++) {
    const pt = steadyPoints[i];

    sumVo += pt.vo;
    sumVoSq += pt.vo * pt.vo;
    sumIo += pt.io;
    sumIoSq += pt.io * pt.io;
    if (pt.io > maxIo) maxIo = pt.io;

    sumIsSq += pt.is * pt.is;
    sumPIn += pt.pIn;
    sumPOut += pt.pOut;

    // Check device blocking voltages
    if (pt.devices) {
      for (const dev of pt.devices) {
        if (dev.voltage < minDeviceV) {
          minDeviceV = dev.voltage;
        }
      }
    }

    if (pt.io <= 1e-4) {
      zeroCurrentCount++;
      if (extinctionAngleBetaDeg === undefined && i > 0 && steadyPoints[i - 1].io > 1e-4) {
        extinctionAngleBetaDeg = pt.thetaDeg;
      }
    }
  }

  const voAvg = Math.max(0, sumVo / N);
  const voRms = Math.sqrt(Math.max(0, sumVoSq / N));
  const ioAvg = Math.max(0, sumIo / N);
  const ioRms = Math.sqrt(Math.max(0, sumIoSq / N));
  const isRms = Math.sqrt(Math.max(0, sumIsSq / N));

  const pDc = voAvg * ioAvg;
  const pOutActive = Math.max(0, sumPOut / N);
  const pInActive = Math.max(0, sumPIn / N);

  // Efficiency
  const efficiencyPercent = pInActive > 1e-3
    ? Math.min(100, (pOutActive / pInActive) * 100)
    : 100;

  // Form factor and ripple factors
  const formFactor = voAvg > 1e-4 ? voRms / voAvg : 1;
  const voltageRippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1));
  const currentFF = ioAvg > 1e-4 ? ioRms / ioAvg : 1;
  const currentRippleFactor = Math.sqrt(Math.max(0, currentFF * currentFF - 1));

  // DCM is detected if current is zero for > 3% of the period
  const conductionMode = (zeroCurrentCount / N) > 0.03 ? 'DCM' : 'CCM';

  // Peak Inverse Voltage is absolute value of maximum reverse blocking voltage
  const peakInverseVoltage = Math.abs(minDeviceV);

  return {
    voAvg,
    voRms,
    ioAvg,
    ioRms,
    ioPeak: maxIo,
    isRms,
    pDc,
    pOutActive,
    pInActive,
    efficiencyPercent,
    formFactor,
    voltageRippleFactor,
    currentRippleFactor,
    conductionMode,
    extinctionAngleBetaDeg,
    peakInverseVoltage,
  };
}
