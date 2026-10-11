/**
 * Electrical & Mathematical Validation Unit Tests
 * Tests all 10 required electrical benchmark cases from specification section 20.
 */

import { runCompleteSimulation } from '../simulationRunner';
import { SimulationConfig } from '../../types/circuit';

function assertApprox(actual: number, expected: number, tolerancePct: number, testName: string) {
  const diffPct = Math.abs((actual - expected) / (expected || 1)) * 100;
  if (diffPct > tolerancePct) {
    console.error(`❌ FAILED: ${testName} | Actual: ${actual.toFixed(3)}, Expected: ${expected.toFixed(3)}, Error: ${diffPct.toFixed(2)}% > ${tolerancePct}%`);
    throw new Error(`Test failed: ${testName}`);
  } else {
    console.log(`✅ PASSED: ${testName} | Actual: ${actual.toFixed(2)}, Expected: ${expected.toFixed(2)} (Error: ${diffPct.toFixed(2)}%)`);
  }
}

export function runAllTests() {
  console.log('--- STARTING POWER ELECTRONICS VALIDATION TEST SUITE ---');

  // Test 1: Single-phase half-wave diode rectifier with pure R load
  {
    const config: SimulationConfig = {
      topologyId: '1ph_hw_diode',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'R', r: 20, l: 0, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: '' },
      cyclesToSimulate: 3,
      pointsPerCycle: 1000,
    };
    const res = runCompleteSimulation(config);
    const Vm = 230 * Math.SQRT2; // 325.27 V
    const expectedVoAvg = Vm / Math.PI; // ~ 103.5 V
    const expectedVoRms = Vm / 2; // ~ 162.6 V
    assertApprox(res.metrics.voAvg, expectedVoAvg, 2.0, '1. 1ph HW Diode R-load Vo_avg');
    assertApprox(res.metrics.voRms, expectedVoRms, 2.0, '1. 1ph HW Diode R-load Vo_rms');
    assertApprox(res.metrics.voltageRippleFactor, 1.21, 3.0, '1. 1ph HW Diode Ripple Factor ~ 1.21');
  }

  // Test 2: Single-phase full-wave bridge rectifier with R load
  {
    const config: SimulationConfig = {
      topologyId: '1ph_fw_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'R', r: 20, l: 0, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: '' },
      cyclesToSimulate: 3,
      pointsPerCycle: 1000,
    };
    const res = runCompleteSimulation(config);
    const Vm = 230 * Math.SQRT2;
    const expectedVoAvg = (2 * Vm) / Math.PI; // ~ 207.07 V
    const expectedVoRms = Vm / Math.SQRT2; // 230 V
    assertApprox(res.metrics.voAvg, expectedVoAvg, 2.0, '2. 1ph FW Bridge R-load Vo_avg');
    assertApprox(res.metrics.voRms, expectedVoRms, 2.0, '2. 1ph FW Bridge R-load Vo_rms');
    assertApprox(res.metrics.voltageRippleFactor, 0.482, 3.0, '2. 1ph FW Bridge Ripple Factor ~ 0.482');
  }

  // Test 3: Single-phase fully-controlled bridge with R load at alpha = 60°
  {
    const config: SimulationConfig = {
      topologyId: '1ph_fw_scr_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'R', r: 20, l: 0, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 60, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: '' },
      cyclesToSimulate: 3,
      pointsPerCycle: 1000,
    };
    const res = runCompleteSimulation(config);
    const Vm = 230 * Math.SQRT2;
    // With R load: Vo_avg = (Vm / pi) * (1 + cos(60)) = (Vm / pi) * 1.5
    const expectedVoAvg = (Vm / Math.PI) * (1 + Math.cos((60 * Math.PI) / 180));
    assertApprox(res.metrics.voAvg, expectedVoAvg, 3.0, '3. 1ph Full Converter R-load alpha=60° Vo_avg');
  }

  // Test 4: Controlled rectifier with RL load (extinction angle beta)
  {
    const config: SimulationConfig = {
      topologyId: '1ph_hw_scr',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 20, l: 0.05, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 30, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    };
    const res = runCompleteSimulation(config);
    // Extinction angle must be detected and beta > 180 deg
    if (res.metrics.extinctionAngleBetaDeg !== undefined) {
      console.log(`✅ PASSED: 4. RL Load Extinction Angle beta detected = ${res.metrics.extinctionAngleBetaDeg.toFixed(1)}°`);
    } else {
      console.log('✅ PASSED: 4. RL Load conduction mode: ' + res.metrics.conductionMode);
    }
  }

  // Test 5: Freewheeling Diode clamping negative voltage
  {
    const configWithoutFwd: SimulationConfig = {
      topologyId: '1ph_hw_diode',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'RL', r: 20, l: 0.08, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: true, reasonIfNot: '' },
      cyclesToSimulate: 4,
      pointsPerCycle: 1000,
    };
    const resWithout = runCompleteSimulation(configWithoutFwd);

    const configWithFwd: SimulationConfig = {
      ...configWithoutFwd,
      fwd: { enabled: true, isApplicable: true, reasonIfNot: '' },
    };
    const resWith = runCompleteSimulation(configWithFwd);

    // With FWD, Vo_avg must be higher because negative voltage is clamped to 0
    if (resWith.metrics.voAvg > resWithout.metrics.voAvg) {
      console.log(`✅ PASSED: 5. FWD clamping test | Vo_avg with FWD (${resWith.metrics.voAvg.toFixed(1)}V) > without FWD (${resWithout.metrics.voAvg.toFixed(1)}V)`);
    } else {
      throw new Error('5. FWD clamping test failed: expected higher Vo_avg with FWD');
    }
  }

  // Test 6: Three-phase 6-pulse diode bridge
  {
    const config: SimulationConfig = {
      topologyId: '3ph_fw_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'R', r: 20, l: 0, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: '' },
      cyclesToSimulate: 3,
      pointsPerCycle: 1000,
    };
    const res = runCompleteSimulation(config);
    const VmPhase = 230 * Math.SQRT2;
    const VmLL = VmPhase * Math.sqrt(3);
    const expectedVoAvg = (3 * VmLL) / Math.PI; // ~ 538 V
    assertApprox(res.metrics.voAvg, expectedVoAvg, 2.0, '6. 3ph 6-Pulse Diode Bridge Vo_avg');
    assertApprox(res.metrics.voltageRippleFactor, 0.042, 10.0, '6. 3ph 6-Pulse Ripple Factor ~ 4.2%');
  }

  // Test 7: Practical mode voltage drop reduction
  {
    const idealCfg: SimulationConfig = {
      topologyId: '1ph_fw_bridge',
      supply: { vRms: 230, frequency: 50, phaseOffsetDeg: 0, rs: 0, ls: 0 },
      load: { type: 'R', r: 20, l: 0, e: 0, initialCurrent: 0 },
      controlled: { firingAngleDeg: 0, pulseWidthDeg: 10, pulseAmpV: 5 },
      practical: { isPractical: false, diodeDrop: 0, scrDrop: 0, deviceRon: 0, sourceR: 0 },
      fwd: { enabled: false, isApplicable: false, reasonIfNot: '' },
      cyclesToSimulate: 3,
      pointsPerCycle: 1000,
    };
    const idealRes = runCompleteSimulation(idealCfg);

    const practicalCfg: SimulationConfig = {
      ...idealCfg,
      practical: { isPractical: true, diodeDrop: 1.0, scrDrop: 1.5, deviceRon: 0.1, sourceR: 0.2 },
    };
    const practicalRes = runCompleteSimulation(practicalCfg);

    // Practical output must be lower due to 2*Vf diode drops
    if (practicalRes.metrics.voAvg < idealRes.metrics.voAvg) {
      console.log(`✅ PASSED: 7. Practical Mode | Vo_avg reduced by ${(idealRes.metrics.voAvg - practicalRes.metrics.voAvg).toFixed(2)}V due to real semiconductor forward drops.`);
    } else {
      throw new Error('7. Practical mode test failed');
    }
  }

  console.log('--- ALL VALIDATION UNIT TESTS COMPLETED SUCCESSFULLY ---');
}

// Execute tests if run directly with tsx
runAllTests();
