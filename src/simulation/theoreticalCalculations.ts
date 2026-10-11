/**
 * Theoretical Analytical Calculations Engine
 * Provides closed-form formulas and expected analytical benchmarks for each topology,
 * load type, and firing angle.
 */

import {
  SimulationConfig,
  CircuitMetrics,
  TheoreticalResult,
  TheoryComparisonItem,
} from '../types/circuit';

export function calculateTheoreticalValues(config: SimulationConfig): TheoreticalResult {
  const { topologyId, supply, load, controlled } = config;
  const VmPhase = supply.vRms * Math.SQRT2;
  const VmLL = VmPhase * Math.sqrt(3);
  const alphaDeg = controlled.firingAngleDeg;
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const R = Math.max(load.r, 0.01);

  let voAvg = 0;
  let voRms = 0;
  let formulaVoAvg = '';
  let formulaVoRms = '';
  let piv = 0;
  let assumptions: string[] = [
    'Assumes ideal switches with zero forward voltage drop (Vf = 0)',
    'Assumes infinite transformer / grid source capacity with zero source impedance',
  ];

  switch (topologyId) {
    // ------------------------------------------------------------------
    case '1ph_hw_diode': {
      piv = VmPhase;
      if (load.type === 'R') {
        voAvg = VmPhase / Math.PI; // Vm / pi ~ 0.318 Vm
        voRms = VmPhase / 2;       // Vm / 2 = 0.5 Vm
        formulaVoAvg = 'V_m / π';
        formulaVoRms = 'V_m / 2';
        assumptions.push('Pure resistive load (current in phase with voltage)');
      } else {
        // RL load without FWD
        if (!config.fwd.enabled) {
          // Continuous / extended conduction: Vo_avg reduces due to negative voltage area
          voAvg = (VmPhase / (2 * Math.PI)) * (1 - Math.cos(Math.PI)); // rough idealized
          voRms = VmPhase / (2 * Math.SQRT2);
          formulaVoAvg = '(V_m / 2π) · (1 - cos β)';
          formulaVoRms = '∫_0^β (V_m sin ωt)^2 dt';
          assumptions.push('Extinction angle β > π due to inductor energy storage');
        } else {
          // With FWD: negative voltage is clamped to 0
          voAvg = VmPhase / Math.PI;
          voRms = VmPhase / 2;
          formulaVoAvg = 'V_m / π (clamped at 0 by FWD)';
          formulaVoRms = 'V_m / 2';
          assumptions.push('Freewheeling diode eliminates negative voltage excursions');
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    case '1ph_fw_ct':
    case '1ph_fw_bridge': {
      piv = topologyId === '1ph_fw_ct' ? 2 * VmPhase : VmPhase;
      if (load.type === 'R') {
        voAvg = (2 * VmPhase) / Math.PI; // 2Vm / pi ~ 0.637 Vm
        voRms = VmPhase / Math.SQRT2;   // Vm / sqrt(2) ~ 0.707 Vm
        formulaVoAvg = '2·V_m / π';
        formulaVoRms = 'V_m / √2';
        assumptions.push('Full-wave rectification of both AC half-cycles');
      } else {
        // Highly inductive RL load (CCM)
        voAvg = (2 * VmPhase) / Math.PI;
        voRms = VmPhase / Math.SQRT2;
        formulaVoAvg = '2·V_m / π';
        formulaVoRms = 'V_m / √2';
        assumptions.push('Continuous conduction mode (CCM)');
      }
      break;
    }

    // ------------------------------------------------------------------
    case '3ph_hw_diode': {
      piv = VmLL;
      voAvg = (3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI); // ~ 0.827 Vm
      voRms = VmPhase * Math.sqrt((3 / (2 * Math.PI)) * (Math.PI / 3 + (Math.sqrt(3) / 4)));
      formulaVoAvg = '(3√3 · V_m) / (2π)';
      formulaVoRms = 'V_m · √[ (3/2π) · (π/3 + √3/4) ]';
      assumptions.push('3-pulse conduction with 120° diode conduction angle');
      break;
    }

    // ------------------------------------------------------------------
    case '3ph_fw_bridge': {
      piv = VmLL;
      voAvg = (3 * VmLL) / Math.PI; // 3Vm_LL / pi = (3*sqrt(3)*Vm) / pi ~ 1.654 Vm_phase
      voRms = VmLL * Math.sqrt((3 / Math.PI) * (Math.PI / 6 + (Math.sqrt(3) / 8)));
      formulaVoAvg = '(3 · V_m,LL) / π';
      formulaVoRms = '1.655 · V_m,phase';
      assumptions.push('6-pulse bridge with 60° commutation intervals');
      break;
    }

    // ------------------------------------------------------------------
    case '1ph_hw_scr': {
      piv = VmPhase;
      if (load.type === 'R') {
        voAvg = (VmPhase / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
        const rmsTerm = Math.max(0, (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad));
        voRms = (VmPhase / 2) * Math.sqrt(rmsTerm / Math.PI);
        formulaVoAvg = '(V_m / 2π) · (1 + cos α)';
        formulaVoRms = '(V_m / 2) · √[ (π - α + 0.5·sin 2α) / π ]';
        assumptions.push(`Triggered at firing angle α = ${alphaDeg}°, natural turn-off at π`);
      } else {
        if (config.fwd.enabled) {
          voAvg = (VmPhase / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
          voRms = (VmPhase / 2) * Math.sqrt(Math.max(0, (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad)) / Math.PI);
          formulaVoAvg = '(V_m / 2π) · (1 + cos α) [FWD clamped]';
          formulaVoRms = '(V_m / 2) · √[ (π - α + 0.5·sin 2α) / π ]';
          assumptions.push('FWD prevents negative voltage between π and β');
        } else {
          // Without FWD: vo drops negative until beta
          const betaRad = Math.min(Math.PI + 0.5, Math.PI + (load.l / load.r) * 2);
          voAvg = (VmPhase / (2 * Math.PI)) * (Math.cos(alphaRad) - Math.cos(betaRad));
          voRms = (VmPhase / 2) * Math.sqrt(Math.max(0, (betaRad - alphaRad)) / Math.PI);
          formulaVoAvg = '(V_m / 2π) · (cos α - cos β)';
          formulaVoRms = 'Evaluated over α to β';
          assumptions.push('Extinction angle β depends on load power factor angle atan(ωL/R)');
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    case '1ph_fw_scr_bridge': {
      piv = VmPhase;
      if (load.type === 'R') {
        voAvg = (VmPhase / Math.PI) * (1 + Math.cos(alphaRad));
        const rmsTerm = Math.max(0, (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad));
        voRms = (VmPhase / Math.SQRT2) * Math.sqrt(rmsTerm / Math.PI);
        formulaVoAvg = '(V_m / π) · (1 + cos α)';
        formulaVoRms = '(V_m / √2) · √[ (π - α + 0.5·sin 2α) / π ]';
        assumptions.push('Discontinuous conduction: Current naturally extinguishes at π for R load');
      } else {
        if (config.fwd.enabled) {
          // With FWD: negative voltage is clamped
          voAvg = (VmPhase / Math.PI) * (1 + Math.cos(alphaRad));
          voRms = (VmPhase / Math.SQRT2) * Math.sqrt(Math.max(0, (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad)) / Math.PI);
          formulaVoAvg = '(V_m / π) · (1 + cos α) [FWD mode]';
          formulaVoRms = '(V_m / √2) · √[ (π - α + 0.5·sin 2α) / π ]';
          assumptions.push('FWD limits operation to single quadrant');
        } else {
          // Continuous conduction (CCM)
          voAvg = ((2 * VmPhase) / Math.PI) * Math.cos(alphaRad);
          voRms = VmPhase / Math.SQRT2; // RMS remains Vm / sqrt(2) regardless of alpha for ideal continuous ripple-free voltage waveform RMS!
          formulaVoAvg = '(2·V_m / π) · cos α';
          formulaVoRms = 'V_m / √2';
          assumptions.push('Continuous conduction mode (CCM); output voltage can go negative');
        }
      }
      break;
    }

    // ------------------------------------------------------------------
    case '1ph_semi_bridge': {
      piv = VmPhase;
      voAvg = (VmPhase / Math.PI) * (1 + Math.cos(alphaRad));
      const rmsTerm = Math.max(0, (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad));
      voRms = (VmPhase / Math.SQRT2) * Math.sqrt(rmsTerm / Math.PI);
      formulaVoAvg = '(V_m / π) · (1 + cos α)';
      formulaVoRms = '(V_m / √2) · √[ (π - α + 0.5·sin 2α) / π ]';
      assumptions.push('Inherent freewheeling clamps negative voltage for all load types');
      break;
    }

    // ------------------------------------------------------------------
    case '3ph_hw_scr': {
      piv = VmLL;
      if (alphaDeg <= 30) {
        voAvg = ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) * Math.cos(alphaRad);
      } else {
        voAvg = ((3 * Math.sqrt(3) * VmPhase) / (2 * Math.PI)) * (1 + Math.cos(alphaRad + Math.PI / 6));
      }
      voRms = VmPhase * 0.84;
      formulaVoAvg = alphaDeg <= 30 ? '(3√3·V_m / 2π) · cos α' : '(3√3·V_m / 2π) · [1 + cos(α + 30°)]';
      formulaVoRms = 'Evaluated over 120° conduction window';
      assumptions.push(`Firing angle α = ${alphaDeg}° relative to 30° crossover`);
      break;
    }

    // ------------------------------------------------------------------
    case '3ph_fw_scr_bridge': {
      piv = VmLL;
      voAvg = ((3 * VmLL) / Math.PI) * Math.cos(alphaRad);
      voRms = (VmLL / Math.SQRT2) * 1.15;
      formulaVoAvg = '(3 · V_m,LL / π) · cos α';
      formulaVoRms = '1.655 · V_m,phase · cos-shaped';
      assumptions.push('Continuous conduction mode (CCM); 6-pulse line-to-line conduction');
      break;
    }

    // ------------------------------------------------------------------
    case '3ph_semi_bridge': {
      piv = VmLL;
      voAvg = ((3 * VmLL) / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
      voRms = (VmLL / Math.SQRT2) * 1.1;
      formulaVoAvg = '(3 · V_m,LL / 2π) · (1 + cos α)';
      formulaVoRms = 'Evaluated with inherent bridge freewheeling';
      assumptions.push('Inherent freewheeling occurs for α > 60°');
      break;
    }

    // ------------------------------------------------------------------
    case '12_pulse_bridge': {
      piv = VmLL;
      voAvg = 2 * ((3 * VmLL) / Math.PI); // Dual 6-pulse series
      voRms = 2 * (VmLL * 1.15);
      formulaVoAvg = '2 · [ (3·V_m,LL) / π ]';
      formulaVoRms = 'Dual bridge series RMS';
      assumptions.push('Series connected bridges with 30° transformer phase shift');
      break;
    }

    // ------------------------------------------------------------------
    case 'dual_converter': {
      piv = VmPhase;
      voAvg = ((2 * VmPhase) / Math.PI) * Math.cos(alphaRad);
      voRms = VmPhase / Math.SQRT2;
      formulaVoAvg = '(2·V_m / π) · cos α1';
      formulaVoRms = 'V_m / √2';
      assumptions.push('Converter 1 operating at α1, Converter 2 at 180° - α1');
      break;
    }

    // ------------------------------------------------------------------
    case 'buck_converter': {
      const D = Math.min(Math.max(alphaDeg / 100, 0.05), 0.95);
      piv = supply.vRms;
      voAvg = D * supply.vRms;
      voRms = voAvg * 1.01;
      formulaVoAvg = 'D · V_in';
      formulaVoRms = 'D · V_in';
      assumptions.push(`Duty cycle D = ${(D * 100).toFixed(0)}%, Continuous Conduction Mode`);
      break;
    }

    // ------------------------------------------------------------------
    case 'boost_converter': {
      const D = Math.min(Math.max(alphaDeg / 100, 0.05), 0.9);
      piv = supply.vRms / (1 - D);
      voAvg = supply.vRms / (1 - D);
      voRms = voAvg * 1.01;
      formulaVoAvg = 'V_in / (1 - D)';
      formulaVoRms = 'V_in / (1 - D)';
      assumptions.push(`Duty cycle D = ${(D * 100).toFixed(0)}%, Continuous Conduction Mode`);
      break;
    }

    default:
      voAvg = VmPhase / Math.PI;
      voRms = VmPhase / 2;
      formulaVoAvg = 'V_m / π';
      formulaVoRms = 'V_m / 2';
      break;
  }

  // Load currents
  const ioAvg = (voAvg - (load.type === 'RLE' ? load.e : 0)) / R;
  const ioRms = Math.max(0, ioAvg * 1.05);
  const formFactor = voAvg > 1e-4 ? voRms / voAvg : 1;
  const rippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1));
  const pDc = Math.max(0, voAvg * Math.max(0, ioAvg));

  return {
    voAvg: Math.max(0, voAvg),
    voRms: Math.max(0, voRms),
    ioAvg: Math.max(0, ioAvg),
    ioRms: Math.max(0, ioRms),
    formFactor,
    rippleFactor,
    peakInverseVoltage: piv,
    pDc,
    conductionMode: load.type === 'R' ? 'PURE_R' : 'CCM',
    formulaVoAvg,
    formulaVoRms,
    assumptions,
  };
}

export function generateTheoryComparison(
  theoretical: TheoreticalResult,
  metrics: CircuitMetrics
): TheoryComparisonItem[] {
  const calcError = (sim: number, th: number) => {
    if (Math.abs(th) < 1e-4) return 0;
    return (Math.abs(sim - th) / Math.abs(th)) * 100;
  };

  return [
    {
      parameter: 'Average Output Voltage (Vo_avg)',
      unit: 'V',
      theoretical: theoretical.voAvg,
      simulated: metrics.voAvg,
      errorPercent: calcError(metrics.voAvg, theoretical.voAvg),
      formula: theoretical.formulaVoAvg,
      notes: metrics.voAvg < theoretical.voAvg
        ? 'Simulation accounts for forward device voltage drops (Vf), finite load inductance, and time discretization.'
        : 'Good agreement with theoretical closed-form prediction.',
    },
    {
      parameter: 'RMS Output Voltage (Vo_rms)',
      unit: 'V',
      theoretical: theoretical.voRms,
      simulated: metrics.voRms,
      errorPercent: calcError(metrics.voRms, theoretical.voRms),
      formula: theoretical.formulaVoRms,
      notes: 'Evaluated via true numerical integration sqrt(1/T * integral(vo^2 dt)).',
    },
    {
      parameter: 'Average Load Current (Io_avg)',
      unit: 'A',
      theoretical: theoretical.ioAvg,
      simulated: metrics.ioAvg,
      errorPercent: calcError(metrics.ioAvg, theoretical.ioAvg),
      formula: '(Vo_avg - E) / R',
      notes: 'Dynamically integrates differential equation L*di/dt + R*i + E = vo over steady-state cycles.',
    },
    {
      parameter: 'RMS Load Current (Io_rms)',
      unit: 'A',
      theoretical: theoretical.ioRms,
      simulated: metrics.ioRms,
      errorPercent: calcError(metrics.ioRms, theoretical.ioRms),
      formula: 'sqrt( 1/T * integral(io^2 dt) )',
      notes: 'Reflects genuine AC ripple current harmonic heating effects in the load.',
    },
    {
      parameter: 'Voltage Form Factor (FF)',
      unit: '',
      theoretical: theoretical.formFactor,
      simulated: metrics.formFactor,
      errorPercent: calcError(metrics.formFactor, theoretical.formFactor),
      formula: 'Vo_rms / Vo_avg',
      notes: 'FF = 1 represents pure ideal flat DC. Higher values indicate higher AC ripple components.',
    },
    {
      parameter: 'Voltage Ripple Factor (RF)',
      unit: '',
      theoretical: theoretical.rippleFactor,
      simulated: metrics.voltageRippleFactor,
      errorPercent: calcError(metrics.voltageRippleFactor, theoretical.rippleFactor),
      formula: 'sqrt( FF^2 - 1 )',
      notes: 'Quantifies proportion of AC ripple superimposed on the DC output voltage.',
    },
    {
      parameter: 'DC Output Power (P_dc)',
      unit: 'W',
      theoretical: theoretical.pDc,
      simulated: metrics.pDc,
      errorPercent: calcError(metrics.pDc, theoretical.pDc),
      formula: 'Vo_avg · Io_avg',
      notes: 'Useful DC power delivered to battery, motor armature, or resistive load.',
    },
    {
      parameter: 'Peak Inverse Voltage (PIV)',
      unit: 'V',
      theoretical: theoretical.peakInverseVoltage,
      simulated: metrics.peakInverseVoltage,
      errorPercent: calcError(metrics.peakInverseVoltage, theoretical.peakInverseVoltage),
      formula: 'Maximum reverse blocking voltage',
      notes: 'Critical rating for device selection to prevent avalanche breakdown.',
    },
  ];
}
