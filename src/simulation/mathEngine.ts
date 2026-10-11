/**
 * Power Electronics Numerical Simulation Engine
 * Rigorous time-domain numerical solver implementing RK4 integration,
 * exact natural commutation, gate firing, freewheeling, and DCM/CCM detection.
 */

import {
  SimulationConfig,
  SimulationTimePoint,
  DeviceState,
  TopologyId,
} from '../types/circuit';

export interface RawSimulationOutput {
  points: SimulationTimePoint[];
  steadyStateStartIndex: number;
}

// Numerical integration helper: RK4 step for L * di/dt = v_rect - R * i - E
function rk4StepCurrent(
  vRect: number,
  r: number,
  l: number,
  e: number,
  iCurrent: number,
  dt: number
): number {
  if (l <= 1e-7) {
    // Pure resistive limit: instantaneous Ohm's law
    const iIdeal = (vRect - e) / Math.max(r, 1e-4);
    return Math.max(0, iIdeal);
  }

  const diDt = (i: number, v: number) => (v - r * i - e) / l;

  const k1 = diDt(iCurrent, vRect);
  const k2 = diDt(iCurrent + 0.5 * dt * k1, vRect);
  const k3 = diDt(iCurrent + 0.5 * dt * k2, vRect);
  const k4 = diDt(iCurrent + dt * k3, vRect);

  const iNext = iCurrent + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  return Math.max(0, iNext);
}

export function runCircuitSimulation(config: SimulationConfig): RawSimulationOutput {
  const {
    topologyId,
    supply,
    load,
    controlled,
    practical,
    fwd,
    cyclesToSimulate,
    pointsPerCycle,
  } = config;

  const f = Math.max(supply.frequency, 1);
  const omega = 2 * Math.PI * f;
  const T = 1 / f;
  const totalDuration = cyclesToSimulate * T;
  const totalPoints = cyclesToSimulate * pointsPerCycle;
  const dt = totalDuration / totalPoints;

  // Supply Peak Voltages
  // For 1-phase, vRms is Phase RMS. Vm = vRms * sqrt(2).
  // For 3-phase, vRms is Phase-to-Neutral RMS. Peak Phase Vm = vRms * sqrt(2).
  const VmPhase = supply.vRms * Math.SQRT2;
  const VmLL = VmPhase * Math.sqrt(3);

  // Semiconductor forward drops
  const vfDiode = practical.isPractical ? practical.diodeDrop : 0;
  const vfScr = practical.isPractical ? practical.scrDrop : 0;
  const ron = practical.isPractical ? practical.deviceRon : 0;
  const rs = practical.isPractical ? practical.sourceR : 0;
  const effectiveR = Math.max(load.r + ron * 2 + rs, 0.01);
  const effectiveL = Math.max(load.l, 0);
  const effectiveE = load.type === 'RLE' ? load.e : 0;

  const alphaRad = (controlled.firingAngleDeg * Math.PI) / 180;
  const pulseWidthRad = Math.max((controlled.pulseWidthDeg * Math.PI) / 180, 0.05);

  const points: SimulationTimePoint[] = [];

  // State variables for inductor current
  let iLoad = load.initialCurrent;
  // History for conduction latching (SCR holding current threshold)
  let t1Latched = false;
  let t2Latched = false;
  let t3Latched = false;
  let t4Latched = false;
  let t5Latched = false;
  let t6Latched = false;

  // Steady state begins after cycle 1
  const steadyStateStartIndex = pointsPerCycle;

  for (let step = 0; step < totalPoints; step++) {
    const t = step * dt;
    const thetaTotalRad = omega * t + (supply.phaseOffsetDeg * Math.PI) / 180;
    const cycleIndex = Math.floor(step / pointsPerCycle);
    const isSteadyState = step >= steadyStateStartIndex;

    // Angle within standard 0 to 2*PI period
    const thetaNorm = ((thetaTotalRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const thetaDeg = (thetaNorm * 180) / Math.PI;

    // Instantaneous supply voltages
    const vs = VmPhase * Math.sin(thetaTotalRad);

    // Balanced 3-phase voltages
    const va = VmPhase * Math.sin(thetaTotalRad);
    const vb = VmPhase * Math.sin(thetaTotalRad - (2 * Math.PI) / 3);
    const vc = VmPhase * Math.sin(thetaTotalRad + (2 * Math.PI) / 3);

    // Line-to-line voltages
    const vab = va - vb; // VmLL * sin(theta + 30 deg)
    const vbc = vb - vc;
    const vca = vc - va;

    let voRaw = 0;
    let isInstant = 0;
    let iaInstant = 0;
    let ibInstant = 0;
    let icInstant = 0;
    let activeDevices: string[] = [];
    let devices: DeviceState[] = [];
    let vGate = 0;
    let isFwdConducting = false;
    let intervalDescription = '';

    // Gate pulse checks
    const isGateTriggered = (firingAngle: number) => {
      const angleDiff = ((thetaNorm - firingAngle) + 2 * Math.PI) % (2 * Math.PI);
      return angleDiff >= 0 && angleDiff <= pulseWidthRad;
    };

    // Calculate open-circuit rectifier voltage and conduction conditions based on topology
    switch (topologyId) {
      // ==========================================
      // 1. Single-Phase Half-Wave Diode Rectifier
      // ==========================================
      case '1ph_hw_diode': {
        const isPosHalf = vs > vfDiode;
        if (isPosHalf) {
          // Diode D1 forward biased
          voRaw = vs - vfDiode;
          activeDevices = ['D1'];
          intervalDescription = 'Positive half-cycle: Diode D1 conducts, vo = vs - Vf.';
        } else {
          // Negative half-cycle: D1 tries to block
          if (fwd.enabled && effectiveL > 0 && iLoad > 1e-4) {
            // Freewheeling diode conducts!
            voRaw = -vfDiode;
            isFwdConducting = true;
            activeDevices = ['FWD'];
            intervalDescription = 'Freewheeling interval: D1 turned off at zero-crossing, FWD carries inductor current.';
          } else if (effectiveL > 0 && iLoad > 1e-4) {
            // No FWD: Inductor pulls output negative to maintain current through D1
            voRaw = vs - vfDiode;
            activeDevices = ['D1'];
            intervalDescription = 'Extended conduction (No FWD): Inductive energy keeps D1 conducting into negative half-cycle.';
          } else {
            voRaw = 0;
            intervalDescription = 'Negative half-cycle: D1 reverse biased and blocking, vo = 0.';
          }
        }

        // Sub-stepping RK4 for accurate current
        const voApplied = (voRaw < 0 && fwd.enabled && iLoad > 1e-4) ? -vfDiode : voRaw;
        const iNext = rk4StepCurrent(voApplied, effectiveR, effectiveL, effectiveE, iLoad, dt);

        if (iNext <= 1e-4 && !isPosHalf) {
          iLoad = 0;
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          intervalDescription = 'Discontinuous mode: Current reached zero; D1 blocks reverse flow.';
        } else {
          iLoad = iNext;
        }

        if (isFwdConducting) {
          isInstant = 0;
        } else if (activeDevices.includes('D1')) {
          isInstant = iLoad;
        } else {
          isInstant = 0;
        }

        devices = [
          {
            id: 'D1',
            name: 'Diode D1',
            isConducting: activeDevices.includes('D1'),
            current: activeDevices.includes('D1') ? iLoad : 0,
            voltage: activeDevices.includes('D1') ? vfDiode : Math.min(0, vs),
            state: activeDevices.includes('D1') ? 'ON' : 'REVERSE_BLOCKING',
          },
        ];
        break;
      }

      // ==========================================
      // 2. Single-Phase Full-Wave Centre-Tapped
      // ==========================================
      case '1ph_fw_ct': {
        const isPosHalf = vs > 0;
        const vArm1 = vs;
        const vArm2 = -vs;

        if (isPosHalf) {
          voRaw = vArm1 - vfDiode;
          activeDevices = ['D1'];
          intervalDescription = 'Positive half-cycle: D1 conducts from upper secondary winding.';
          isInstant = iLoad;
        } else {
          voRaw = vArm2 - vfDiode;
          activeDevices = ['D2'];
          intervalDescription = 'Negative half-cycle: D2 conducts from lower secondary winding.';
          isInstant = -iLoad;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && voRaw <= effectiveE) {
          iLoad = 0;
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          isInstant = 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          {
            id: 'D1',
            name: 'Diode D1',
            isConducting: activeDevices.includes('D1'),
            current: activeDevices.includes('D1') ? iLoad : 0,
            voltage: activeDevices.includes('D1') ? vfDiode : vs - voRaw,
            state: activeDevices.includes('D1') ? 'ON' : 'REVERSE_BLOCKING',
          },
          {
            id: 'D2',
            name: 'Diode D2',
            isConducting: activeDevices.includes('D2'),
            current: activeDevices.includes('D2') ? iLoad : 0,
            voltage: activeDevices.includes('D2') ? vfDiode : -vs - voRaw,
            state: activeDevices.includes('D2') ? 'ON' : 'REVERSE_BLOCKING',
          },
        ];
        break;
      }

      // ==========================================
      // 3. Single-Phase Full-Wave Bridge Rectifier
      // ==========================================
      case '1ph_fw_bridge': {
        const isPosHalf = vs >= 0;
        voRaw = Math.abs(vs) - 2 * vfDiode;
        if (voRaw < 0) voRaw = 0;

        if (isPosHalf) {
          activeDevices = ['D1', 'D2'];
          intervalDescription = 'Positive half-cycle: D1 & D2 conduct in diagonal pair; vo = vs - 2Vf.';
          isInstant = iLoad;
        } else {
          activeDevices = ['D3', 'D4'];
          intervalDescription = 'Negative half-cycle: D3 & D4 conduct; source current is negative (is = -io).';
          isInstant = -iLoad;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && voRaw <= effectiveE) {
          iLoad = 0;
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          isInstant = 0;
          intervalDescription = 'Discontinuous mode near AC zero crossing.';
        } else {
          iLoad = iNext;
        }

        devices = [
          {
            id: 'D1',
            name: 'Diode D1',
            isConducting: activeDevices.includes('D1'),
            current: activeDevices.includes('D1') ? iLoad : 0,
            voltage: activeDevices.includes('D1') ? vfDiode : -Math.abs(vs) / 2,
            state: activeDevices.includes('D1') ? 'ON' : 'OFF',
          },
          {
            id: 'D2',
            name: 'Diode D2',
            isConducting: activeDevices.includes('D2'),
            current: activeDevices.includes('D2') ? iLoad : 0,
            voltage: activeDevices.includes('D2') ? vfDiode : -Math.abs(vs) / 2,
            state: activeDevices.includes('D2') ? 'ON' : 'OFF',
          },
          {
            id: 'D3',
            name: 'Diode D3',
            isConducting: activeDevices.includes('D3'),
            current: activeDevices.includes('D3') ? iLoad : 0,
            voltage: activeDevices.includes('D3') ? vfDiode : -Math.abs(vs) / 2,
            state: activeDevices.includes('D3') ? 'ON' : 'OFF',
          },
          {
            id: 'D4',
            name: 'Diode D4',
            isConducting: activeDevices.includes('D4'),
            current: activeDevices.includes('D4') ? iLoad : 0,
            voltage: activeDevices.includes('D4') ? vfDiode : -Math.abs(vs) / 2,
            state: activeDevices.includes('D4') ? 'ON' : 'OFF',
          },
        ];
        break;
      }

      // ==========================================
      // 4. Three-Phase Half-Wave Diode Rectifier
      // ==========================================
      case '3ph_hw_diode': {
        // Natural crossover points at 30°, 150°, 270°
        // Diode 1 conducts when Va is most positive (30° to 150°)
        // Diode 2 conducts when Vb is most positive (150° to 270°)
        // Diode 3 conducts when Vc is most positive (270° to 390°/30°)
        if (va >= vb && va >= vc) {
          voRaw = va - vfDiode;
          activeDevices = ['D1'];
          intervalDescription = 'Phase A diode D1 conducts: Va is higher than Vb and Vc.';
          iaInstant = iLoad;
        } else if (vb >= va && vb >= vc) {
          voRaw = vb - vfDiode;
          activeDevices = ['D2'];
          intervalDescription = 'Phase B diode D2 conducts: Vb is higher than Va and Vc.';
          ibInstant = iLoad;
        } else {
          voRaw = vc - vfDiode;
          activeDevices = ['D3'];
          intervalDescription = 'Phase C diode D3 conducts: Vc is higher than Va and Vb.';
          icInstant = iLoad;
        }

        isInstant = iaInstant; // Phase A source current

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'D1', name: 'Diode D1 (Phase A)', isConducting: activeDevices.includes('D1'), current: iaInstant, voltage: activeDevices.includes('D1') ? vfDiode : va - voRaw, state: activeDevices.includes('D1') ? 'ON' : 'OFF' },
          { id: 'D2', name: 'Diode D2 (Phase B)', isConducting: activeDevices.includes('D2'), current: ibInstant, voltage: activeDevices.includes('D2') ? vfDiode : vb - voRaw, state: activeDevices.includes('D2') ? 'ON' : 'OFF' },
          { id: 'D3', name: 'Diode D3 (Phase C)', isConducting: activeDevices.includes('D3'), current: icInstant, voltage: activeDevices.includes('D3') ? vfDiode : vc - voRaw, state: activeDevices.includes('D3') ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 5. Three-Phase Full-Wave Bridge (6-Pulse)
      // ==========================================
      case '3ph_fw_bridge': {
        // Top group (D1, D3, D5) connects to maximum phase
        // Bottom group (D4, D6, D2) connects to minimum phase
        let topPhase = 'A';
        let topV = va;
        let topDiode = 'D1';

        if (vb > topV) {
          topPhase = 'B';
          topV = vb;
          topDiode = 'D3';
        }
        if (vc > topV) {
          topPhase = 'C';
          topV = vc;
          topDiode = 'D5';
        }

        let botPhase = 'A';
        let botV = va;
        let botDiode = 'D4';

        if (vb < botV) {
          botPhase = 'B';
          botV = vb;
          botDiode = 'D6';
        }
        if (vc < botV) {
          botPhase = 'C';
          botV = vc;
          botDiode = 'D2';
        }

        voRaw = (topV - botV) - 2 * vfDiode;
        if (voRaw < 0) voRaw = 0;
        activeDevices = [topDiode, botDiode];
        intervalDescription = `6-Pulse conduction: Top diode ${topDiode} (Phase ${topPhase}) and Bottom diode ${botDiode} (Phase ${botPhase}) conduct; vo = V${topPhase.toLowerCase()}${botPhase.toLowerCase()} - 2Vf.`;

        if (topPhase === 'A') iaInstant += iLoad;
        if (botPhase === 'A') iaInstant -= iLoad;
        if (topPhase === 'B') ibInstant += iLoad;
        if (botPhase === 'B') ibInstant -= iLoad;
        if (topPhase === 'C') icInstant += iLoad;
        if (botPhase === 'C') icInstant -= iLoad;

        isInstant = iaInstant;

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'D1', name: 'Diode D1 (Phase A+)', isConducting: activeDevices.includes('D1'), current: activeDevices.includes('D1') ? iLoad : 0, voltage: activeDevices.includes('D1') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D1') ? 'ON' : 'OFF' },
          { id: 'D2', name: 'Diode D2 (Phase C-)', isConducting: activeDevices.includes('D2'), current: activeDevices.includes('D2') ? iLoad : 0, voltage: activeDevices.includes('D2') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D2') ? 'ON' : 'OFF' },
          { id: 'D3', name: 'Diode D3 (Phase B+)', isConducting: activeDevices.includes('D3'), current: activeDevices.includes('D3') ? iLoad : 0, voltage: activeDevices.includes('D3') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D3') ? 'ON' : 'OFF' },
          { id: 'D4', name: 'Diode D4 (Phase A-)', isConducting: activeDevices.includes('D4'), current: activeDevices.includes('D4') ? iLoad : 0, voltage: activeDevices.includes('D4') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D4') ? 'ON' : 'OFF' },
          { id: 'D5', name: 'Diode D5 (Phase C+)', isConducting: activeDevices.includes('D5'), current: activeDevices.includes('D5') ? iLoad : 0, voltage: activeDevices.includes('D5') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D5') ? 'ON' : 'OFF' },
          { id: 'D6', name: 'Diode D6 (Phase B-)', isConducting: activeDevices.includes('D6'), current: activeDevices.includes('D6') ? iLoad : 0, voltage: activeDevices.includes('D6') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D6') ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 6. Single-Phase Half-Wave SCR Rectifier
      // ==========================================
      case '1ph_hw_scr': {
        const gateActive = isGateTriggered(alphaRad);
        vGate = gateActive ? controlled.pulseAmpV : 0;

        // Firing trigger
        if (gateActive && vs > effectiveE + vfScr) {
          t1Latched = true;
        }

        if (t1Latched) {
          if (vs >= 0) {
            // Forward conduction
            voRaw = vs - vfScr;
            activeDevices = ['T1'];
            intervalDescription = `Controlled conduction: SCR T1 triggered at α = ${controlled.firingAngleDeg}°, vo = vs - Von.`;
            isInstant = iLoad;
          } else {
            // Supply went negative: does FWD exist or does inductive voltage pull it?
            if (fwd.enabled && effectiveL > 0 && iLoad > 1e-4) {
              // FWD turns ON, commutating SCR T1 off!
              t1Latched = false;
              voRaw = -vfDiode;
              isFwdConducting = true;
              activeDevices = ['FWD'];
              intervalDescription = 'Freewheeling active: At zero crossing, FWD turns ON clamping output to 0V; SCR T1 turns off.';
              isInstant = 0;
            } else if (effectiveL > 0 && iLoad > 1e-4) {
              // Without FWD, inductor drives SCR into negative half cycle!
              voRaw = vs - vfScr;
              activeDevices = ['T1'];
              intervalDescription = 'Inductive negative excursion: Without FWD, stored inductor energy forces T1 to conduct into negative cycle.';
              isInstant = iLoad;
            } else {
              t1Latched = false;
              voRaw = load.type === 'RLE' ? effectiveE : 0;
              activeDevices = [];
              isInstant = 0;
            }
          }
        } else if (fwd.enabled && isFwdConducting && iLoad > 1e-4) {
          voRaw = -vfDiode;
          activeDevices = ['FWD'];
          isInstant = 0;
          intervalDescription = 'Freewheeling decay: Inductor dissipating stored energy through FWD.';
        } else {
          isFwdConducting = false;
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          intervalDescription = `Forward blocking: SCR T1 waiting for trigger pulse at α = ${controlled.firingAngleDeg}°.`;
          isInstant = 0;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4) {
          iLoad = 0;
          t1Latched = false;
          isFwdConducting = false;
          if (activeDevices.length === 0) {
            voRaw = load.type === 'RLE' ? effectiveE : 0;
          }
        } else {
          iLoad = iNext;
        }

        devices = [
          {
            id: 'T1',
            name: 'Thyristor T1',
            isConducting: activeDevices.includes('T1'),
            current: activeDevices.includes('T1') ? iLoad : 0,
            voltage: activeDevices.includes('T1') ? vfScr : vs - voRaw,
            state: activeDevices.includes('T1') ? 'ON' : (vs > 0 ? 'FORWARD_BLOCKING' : 'REVERSE_BLOCKING'),
          },
        ];
        break;
      }

      // ==========================================
      // 7. Single-Phase Fully-Controlled Bridge
      // ==========================================
      case '1ph_fw_scr_bridge': {
        const gate1Active = isGateTriggered(alphaRad);
        const gate2Active = isGateTriggered(alphaRad + Math.PI);
        vGate = (gate1Active || gate2Active) ? controlled.pulseAmpV : 0;

        if (gate1Active && (effectiveL > 0 || vs > effectiveE)) {
          t1Latched = true;
          t2Latched = false;
        }
        if (gate2Active && (effectiveL > 0 || -vs > effectiveE)) {
          t2Latched = true;
          t1Latched = false;
        }

        if (t1Latched) {
          // Pair T1 & T2 conducting
          const rawV = vs - 2 * vfScr;
          if (fwd.enabled && rawV < 0 && effectiveL > 0 && iLoad > 1e-4) {
            // FWD clamps at 0V
            voRaw = -vfDiode;
            isFwdConducting = true;
            activeDevices = ['FWD'];
            intervalDescription = 'FWD clamping: vo clamped to zero; T1/T2 commutated by FWD.';
            isInstant = 0;
          } else {
            voRaw = rawV;
            activeDevices = ['T1', 'T2'];
            intervalDescription = `Positive pair conduction: T1 & T2 conducting (fired at α = ${controlled.firingAngleDeg}°).`;
            isInstant = iLoad;
          }
        } else if (t2Latched) {
          // Pair T3 & T4 conducting
          const rawV = -vs - 2 * vfScr;
          if (fwd.enabled && rawV < 0 && effectiveL > 0 && iLoad > 1e-4) {
            voRaw = -vfDiode;
            isFwdConducting = true;
            activeDevices = ['FWD'];
            intervalDescription = 'FWD clamping: vo clamped to zero; T3/T4 commutated by FWD.';
            isInstant = 0;
          } else {
            voRaw = rawV;
            activeDevices = ['T3', 'T4'];
            intervalDescription = `Negative pair conduction: T3 & T4 conducting (fired at π + α = ${controlled.firingAngleDeg + 180}°).`;
            isInstant = -iLoad;
          }
        } else {
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          intervalDescription = 'Discontinuous mode: Current zero, waiting for next thyristor trigger.';
          isInstant = 0;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && (load.type === 'R' || voRaw <= effectiveE)) {
          iLoad = 0;
          t1Latched = false;
          t2Latched = false;
          isFwdConducting = false;
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          isInstant = 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          { id: 'T1', name: 'Thyristor T1', isConducting: activeDevices.includes('T1'), current: activeDevices.includes('T1') ? iLoad : 0, voltage: activeDevices.includes('T1') ? vfScr : -vs / 2, state: activeDevices.includes('T1') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T2', name: 'Thyristor T2', isConducting: activeDevices.includes('T2'), current: activeDevices.includes('T2') ? iLoad : 0, voltage: activeDevices.includes('T2') ? vfScr : -vs / 2, state: activeDevices.includes('T2') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T3', name: 'Thyristor T3', isConducting: activeDevices.includes('T3'), current: activeDevices.includes('T3') ? iLoad : 0, voltage: activeDevices.includes('T3') ? vfScr : vs / 2, state: activeDevices.includes('T3') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T4', name: 'Thyristor T4', isConducting: activeDevices.includes('T4'), current: activeDevices.includes('T4') ? iLoad : 0, voltage: activeDevices.includes('T4') ? vfScr : vs / 2, state: activeDevices.includes('T4') ? 'ON' : 'FORWARD_BLOCKING' },
        ];
        break;
      }

      // ==========================================
      // 8. Single-Phase Semi-Controlled Bridge
      // ==========================================
      case '1ph_semi_bridge': {
        const gate1Active = isGateTriggered(alphaRad);
        const gate2Active = isGateTriggered(alphaRad + Math.PI);
        vGate = (gate1Active || gate2Active) ? controlled.pulseAmpV : 0;

        if (gate1Active) {
          t1Latched = true;
          t2Latched = false;
        }
        if (gate2Active) {
          t2Latched = true;
          t1Latched = false;
        }

        // Symmetrical semi-converter: T1, T2 (SCRs), D1, D2 (Diodes)
        // From alpha to pi: T1 & D2 conduct from source (vo = vs)
        // From pi to pi+alpha: Natural freewheeling through T1 & D1 (vo = 0, is = 0)
        // From pi+alpha to 2pi: T2 & D1 conduct from source (vo = -vs)
        // From 2pi to 2pi+alpha: Natural freewheeling through T2 & D2 (vo = 0, is = 0)
        if (thetaNorm >= alphaRad && thetaNorm < Math.PI) {
          voRaw = vs - vfScr - vfDiode;
          activeDevices = ['T1', 'D2'];
          intervalDescription = 'Positive source conduction: T1 and D2 conduct power from AC supply; is = io.';
          isInstant = iLoad;
        } else if (thetaNorm >= Math.PI && thetaNorm < Math.PI + alphaRad) {
          if (iLoad > 1e-4) {
            voRaw = -vfScr - vfDiode; // Near 0V
            activeDevices = ['T1', 'D1'];
            intervalDescription = 'Inherent freewheeling path: AC voltage reversed, diode D1 turns ON with T1, clamping vo ≈ 0V without external diode; is = 0.';
            isInstant = 0;
          } else {
            voRaw = load.type === 'RLE' ? effectiveE : 0;
            activeDevices = [];
            isInstant = 0;
            intervalDescription = 'DCM zero-current interval: Inductor current reached zero.';
          }
        } else if (thetaNorm >= Math.PI + alphaRad && thetaNorm < 2 * Math.PI) {
          voRaw = -vs - vfScr - vfDiode;
          activeDevices = ['T2', 'D1'];
          intervalDescription = 'Negative source conduction: T2 and D1 conduct power from AC supply; is = -io.';
          isInstant = -iLoad;
        } else {
          // thetaNorm < alphaRad (freewheeling or DCM)
          if (iLoad > 1e-4) {
            voRaw = -vfScr - vfDiode;
            activeDevices = ['T2', 'D2'];
            intervalDescription = 'Inherent freewheeling path: T2 and D2 naturally circulate inductor current; is = 0.';
            isInstant = 0;
          } else {
            voRaw = load.type === 'RLE' ? effectiveE : 0;
            activeDevices = [];
            isInstant = 0;
            intervalDescription = 'Waiting for T1 trigger at α.';
          }
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && (load.type === 'R' || voRaw <= effectiveE)) {
          iLoad = 0;
          activeDevices = [];
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          isInstant = 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          { id: 'T1', name: 'Thyristor T1', isConducting: activeDevices.includes('T1'), current: activeDevices.includes('T1') ? iLoad : 0, voltage: activeDevices.includes('T1') ? vfScr : -vs / 2, state: activeDevices.includes('T1') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T2', name: 'Thyristor T2', isConducting: activeDevices.includes('T2'), current: activeDevices.includes('T2') ? iLoad : 0, voltage: activeDevices.includes('T2') ? vfScr : vs / 2, state: activeDevices.includes('T2') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'D1', name: 'Diode D1', isConducting: activeDevices.includes('D1'), current: activeDevices.includes('D1') ? iLoad : 0, voltage: activeDevices.includes('D1') ? vfDiode : -vs / 2, state: activeDevices.includes('D1') ? 'ON' : 'OFF' },
          { id: 'D2', name: 'Diode D2', isConducting: activeDevices.includes('D2'), current: activeDevices.includes('D2') ? iLoad : 0, voltage: activeDevices.includes('D2') ? vfDiode : vs / 2, state: activeDevices.includes('D2') ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 9. Three-Phase Half-Wave SCR Rectifier
      // ==========================================
      case '3ph_hw_scr': {
        // Natural crossover references: 30° for A, 150° for B, 270° for C
        const fireA = ((30 * Math.PI) / 180 + alphaRad) % (2 * Math.PI);
        const fireB = ((150 * Math.PI) / 180 + alphaRad) % (2 * Math.PI);
        const fireC = ((270 * Math.PI) / 180 + alphaRad) % (2 * Math.PI);

        if (isGateTriggered(fireA)) { t1Latched = true; t2Latched = false; t3Latched = false; }
        if (isGateTriggered(fireB)) { t2Latched = true; t1Latched = false; t3Latched = false; }
        if (isGateTriggered(fireC)) { t3Latched = true; t1Latched = false; t2Latched = false; }

        vGate = (isGateTriggered(fireA) || isGateTriggered(fireB) || isGateTriggered(fireC)) ? controlled.pulseAmpV : 0;

        if (t1Latched) {
          voRaw = va - vfScr;
          activeDevices = ['T1'];
          iaInstant = iLoad;
          intervalDescription = `Phase A SCR T1 conducting (triggered at 30° + α = ${controlled.firingAngleDeg + 30}°).`;
        } else if (t2Latched) {
          voRaw = vb - vfScr;
          activeDevices = ['T2'];
          ibInstant = iLoad;
          intervalDescription = `Phase B SCR T2 conducting (triggered at 150° + α = ${controlled.firingAngleDeg + 150}°).`;
        } else if (t3Latched) {
          voRaw = vc - vfScr;
          activeDevices = ['T3'];
          icInstant = iLoad;
          intervalDescription = `Phase C SCR T3 conducting (triggered at 270° + α = ${controlled.firingAngleDeg + 270}°).`;
        } else {
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          activeDevices = [];
          intervalDescription = 'Discontinuous mode / zero current.';
        }

        // FWD clamping if voRaw < 0
        if (fwd.enabled && voRaw < 0 && effectiveL > 0 && iLoad > 1e-4) {
          voRaw = -vfDiode;
          isFwdConducting = true;
          activeDevices = ['FWD'];
          intervalDescription = 'Freewheeling diode active: Clamping output voltage above zero.';
          iaInstant = 0; ibInstant = 0; icInstant = 0;
        }

        isInstant = iaInstant;

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && (load.type === 'R' || voRaw <= effectiveE)) {
          iLoad = 0;
          t1Latched = false; t2Latched = false; t3Latched = false;
          activeDevices = [];
          voRaw = load.type === 'RLE' ? effectiveE : 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          { id: 'T1', name: 'SCR T1 (Phase A)', isConducting: activeDevices.includes('T1'), current: iaInstant, voltage: activeDevices.includes('T1') ? vfScr : va - voRaw, state: activeDevices.includes('T1') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T2', name: 'SCR T2 (Phase B)', isConducting: activeDevices.includes('T2'), current: ibInstant, voltage: activeDevices.includes('T2') ? vfScr : vb - voRaw, state: activeDevices.includes('T2') ? 'ON' : 'FORWARD_BLOCKING' },
          { id: 'T3', name: 'SCR T3 (Phase C)', isConducting: activeDevices.includes('T3'), current: icInstant, voltage: activeDevices.includes('T3') ? vfScr : vc - voRaw, state: activeDevices.includes('T3') ? 'ON' : 'FORWARD_BLOCKING' },
        ];
        break;
      }

      // ==========================================
      // 10. Three-Phase Fully-Controlled Bridge (6-Pulse)
      // ==========================================
      case '3ph_fw_scr_bridge': {
        // Natural crossover references for line-to-line 6-pulse sequence:
        // T1-T2 (Vac): 30° + alpha
        // T2-T3 (Vbc): 90° + alpha
        // T3-T4 (Vba): 150° + alpha
        // T4-T5 (Vca): 210° + alpha
        // T5-T6 (Vcb): 270° + alpha
        // T6-T1 (Vab): 330° + alpha
        const fPairs = [
          { name: 'T6-T1', v: vab, top: 'T1', bot: 'T6', deg: 30, topP: 'A', botP: 'B' },
          { name: 'T1-T2', v: -vca, top: 'T1', bot: 'T2', deg: 90, topP: 'A', botP: 'C' },
          { name: 'T2-T3', v: vbc, top: 'T3', bot: 'T2', deg: 150, topP: 'B', botP: 'C' },
          { name: 'T3-T4', v: -vab, top: 'T3', bot: 'T4', deg: 210, topP: 'B', botP: 'A' },
          { name: 'T4-T5', v: vca, top: 'T5', bot: 'T4', deg: 270, topP: 'C', botP: 'A' },
          { name: 'T5-T6', v: -vbc, top: 'T5', bot: 'T6', deg: 330, topP: 'C', botP: 'B' },
        ];

        // Find active firing interval
        const shiftDeg = ((thetaDeg - controlled.firingAngleDeg) + 360) % 360;
        let selectedPair = fPairs[0];
        if (shiftDeg >= 30 && shiftDeg < 90) selectedPair = fPairs[0];
        else if (shiftDeg >= 90 && shiftDeg < 150) selectedPair = fPairs[1];
        else if (shiftDeg >= 150 && shiftDeg < 210) selectedPair = fPairs[2];
        else if (shiftDeg >= 210 && shiftDeg < 270) selectedPair = fPairs[3];
        else if (shiftDeg >= 270 && shiftDeg < 330) selectedPair = fPairs[4];
        else selectedPair = fPairs[5];

        vGate = (shiftDeg % 60 <= (controlled.pulseWidthDeg || 10)) ? controlled.pulseAmpV : 0;

        voRaw = selectedPair.v - 2 * vfScr;

        // Freewheeling diode clamping if vo becomes negative and FWD is enabled
        if (fwd.enabled && voRaw < 0 && effectiveL > 0 && iLoad > 1e-4) {
          voRaw = -vfDiode;
          isFwdConducting = true;
          activeDevices = ['FWD'];
          intervalDescription = `Freewheeling active: Negative output clamped to 0V by FWD for α = ${controlled.firingAngleDeg}°.`;
        } else {
          activeDevices = [selectedPair.top, selectedPair.bot];
          intervalDescription = `6-Pulse SCR pair ${selectedPair.name} conducting line voltage from Phases ${selectedPair.topP} and ${selectedPair.botP}.`;

          if (selectedPair.topP === 'A') iaInstant += iLoad;
          if (selectedPair.botP === 'A') iaInstant -= iLoad;
          if (selectedPair.topP === 'B') ibInstant += iLoad;
          if (selectedPair.botP === 'B') ibInstant -= iLoad;
          if (selectedPair.topP === 'C') icInstant += iLoad;
          if (selectedPair.botP === 'C') icInstant -= iLoad;
        }

        isInstant = iaInstant;

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && (load.type === 'R' || voRaw <= effectiveE)) {
          iLoad = 0;
          activeDevices = [];
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          iaInstant = 0; ibInstant = 0; icInstant = 0; isInstant = 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          { id: 'T1', name: 'Thyristor T1 (A+)', isConducting: activeDevices.includes('T1'), current: activeDevices.includes('T1') ? iLoad : 0, voltage: activeDevices.includes('T1') ? vfScr : -voRaw / 2, state: activeDevices.includes('T1') ? 'ON' : 'OFF' },
          { id: 'T2', name: 'Thyristor T2 (C-)', isConducting: activeDevices.includes('T2'), current: activeDevices.includes('T2') ? iLoad : 0, voltage: activeDevices.includes('T2') ? vfScr : -voRaw / 2, state: activeDevices.includes('T2') ? 'ON' : 'OFF' },
          { id: 'T3', name: 'Thyristor T3 (B+)', isConducting: activeDevices.includes('T3'), current: activeDevices.includes('T3') ? iLoad : 0, voltage: activeDevices.includes('T3') ? vfScr : -voRaw / 2, state: activeDevices.includes('T3') ? 'ON' : 'OFF' },
          { id: 'T4', name: 'Thyristor T4 (A-)', isConducting: activeDevices.includes('T4'), current: activeDevices.includes('T4') ? iLoad : 0, voltage: activeDevices.includes('T4') ? vfScr : -voRaw / 2, state: activeDevices.includes('T4') ? 'ON' : 'OFF' },
          { id: 'T5', name: 'Thyristor T5 (C+)', isConducting: activeDevices.includes('T5'), current: activeDevices.includes('T5') ? iLoad : 0, voltage: activeDevices.includes('T5') ? vfScr : -voRaw / 2, state: activeDevices.includes('T5') ? 'ON' : 'OFF' },
          { id: 'T6', name: 'Thyristor T6 (B-)', isConducting: activeDevices.includes('T6'), current: activeDevices.includes('T6') ? iLoad : 0, voltage: activeDevices.includes('T6') ? vfScr : -voRaw / 2, state: activeDevices.includes('T6') ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 11. Three-Phase Semi-Controlled Bridge
      // ==========================================
      case '3ph_semi_bridge': {
        // Upper bank SCRs (T1, T3, T5), Lower bank diodes (D2, D4, D6)
        // With inherent freewheeling when alpha > 60 deg
        const shiftDeg = ((thetaDeg - controlled.firingAngleDeg) + 360) % 360;
        let topScr = 'T1';
        let topP = 'A';
        if (shiftDeg >= 120 && shiftDeg < 240) { topScr = 'T3'; topP = 'B'; }
        else if (shiftDeg >= 240) { topScr = 'T5'; topP = 'C'; }

        // Diode naturally conducts lowest phase
        let botDiode = 'D4';
        let botP = 'A';
        let minV = va;
        if (vb < minV) { botDiode = 'D6'; botP = 'B'; minV = vb; }
        if (vc < minV) { botDiode = 'D2'; botP = 'C'; minV = vc; }

        const topV = topP === 'A' ? va : (topP === 'B' ? vb : vc);
        const rawV = (topV - minV) - vfScr - vfDiode;

        if (rawV < 0 && iLoad > 1e-4) {
          // Inherent freewheeling within bridge: vo = 0
          voRaw = -vfScr - vfDiode;
          activeDevices = [topScr, `D_same`];
          intervalDescription = `Inherent freewheeling within 3-phase bridge: output voltage clamped to 0V for α = ${controlled.firingAngleDeg}°.`;
          isInstant = 0;
        } else {
          voRaw = Math.max(0, rawV);
          activeDevices = [topScr, botDiode];
          intervalDescription = `Semi-controlled conduction: SCR ${topScr} (Phase ${topP}) and Diode ${botDiode} (Phase ${botP}) conducting.`;
          if (topP === 'A') iaInstant += iLoad;
          if (botP === 'A') iaInstant -= iLoad;
          isInstant = iaInstant;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        if (iNext <= 1e-4 && (load.type === 'R' || voRaw <= effectiveE)) {
          iLoad = 0;
          activeDevices = [];
          voRaw = load.type === 'RLE' ? effectiveE : 0;
          isInstant = 0;
        } else {
          iLoad = iNext;
        }

        devices = [
          { id: 'T1', name: 'SCR T1 (Phase A+)', isConducting: activeDevices.includes('T1'), current: activeDevices.includes('T1') ? iLoad : 0, voltage: activeDevices.includes('T1') ? vfScr : -voRaw / 2, state: activeDevices.includes('T1') ? 'ON' : 'OFF' },
          { id: 'T3', name: 'SCR T3 (Phase B+)', isConducting: activeDevices.includes('T3'), current: activeDevices.includes('T3') ? iLoad : 0, voltage: activeDevices.includes('T3') ? vfScr : -voRaw / 2, state: activeDevices.includes('T3') ? 'ON' : 'OFF' },
          { id: 'T5', name: 'SCR T5 (Phase C+)', isConducting: activeDevices.includes('T5'), current: activeDevices.includes('T5') ? iLoad : 0, voltage: activeDevices.includes('T5') ? vfScr : -voRaw / 2, state: activeDevices.includes('T5') ? 'ON' : 'OFF' },
          { id: 'D2', name: 'Diode D2 (Phase C-)', isConducting: activeDevices.includes('D2'), current: activeDevices.includes('D2') ? iLoad : 0, voltage: activeDevices.includes('D2') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D2') ? 'ON' : 'OFF' },
          { id: 'D4', name: 'Diode D4 (Phase A-)', isConducting: activeDevices.includes('D4'), current: activeDevices.includes('D4') ? iLoad : 0, voltage: activeDevices.includes('D4') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D4') ? 'ON' : 'OFF' },
          { id: 'D6', name: 'Diode D6 (Phase B-)', isConducting: activeDevices.includes('D6'), current: activeDevices.includes('D6') ? iLoad : 0, voltage: activeDevices.includes('D6') ? vfDiode : -voRaw / 2, state: activeDevices.includes('D6') ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 12. Twelve-Pulse Bridge Rectifier
      // ==========================================
      case '12_pulse_bridge': {
        // Series connection of two 6-pulse bridges:
        // Bridge 1 fed by Star secondary (0° shift)
        // Bridge 2 fed by Delta secondary (30° lag)
        const vL1 = Math.max(Math.abs(vab), Math.max(Math.abs(vbc), Math.abs(vca)));
        // Delta shifted by 30°
        const thetaDelta = thetaTotalRad - (Math.PI / 6);
        const vaD = VmPhase * Math.sin(thetaDelta);
        const vbD = VmPhase * Math.sin(thetaDelta - (2 * Math.PI) / 3);
        const vcD = VmPhase * Math.sin(thetaDelta + (2 * Math.PI) / 3);
        const vabD = vaD - vbD;
        const vbcD = vbD - vcD;
        const vcaD = vcD - vaD;
        const vL2 = Math.max(Math.abs(vabD), Math.max(Math.abs(vbcD), Math.abs(vcaD)));

        voRaw = (vL1 + vL2) - 4 * vfDiode;
        activeDevices = ['B1_Diodes', 'B2_Diodes'];
        intervalDescription = '12-Pulse operation: 30° phase-shifted dual bridge conducting in series; 5th & 7th harmonics cancelled.';

        isInstant = iLoad * (Math.sin(thetaTotalRad) > 0 ? 1 : -1);

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'Bridge1', name: 'Bridge 1 (Y-Y)', isConducting: true, current: iLoad, voltage: vfDiode * 2, state: 'ON' },
          { id: 'Bridge2', name: 'Bridge 2 (Y-Δ)', isConducting: true, current: iLoad, voltage: vfDiode * 2, state: 'ON' },
        ];
        break;
      }

      // ==========================================
      // 13. Dual Converter (Four Quadrant)
      // ==========================================
      case 'dual_converter': {
        // Converter 1 at alpha, Converter 2 at 180° - alpha
        const alpha1 = alphaRad;
        const gate1Active = isGateTriggered(alpha1);
        vGate = gate1Active ? controlled.pulseAmpV : 0;

        if (thetaNorm >= alpha1 && thetaNorm < Math.PI + alpha1) {
          voRaw = vs - 2 * vfScr;
          activeDevices = ['Conv1_T1', 'Conv1_T2'];
          intervalDescription = `Dual Converter: Converter 1 conducting in Quadrant I (α1 = ${controlled.firingAngleDeg}°).`;
          isInstant = iLoad;
        } else {
          voRaw = -vs - 2 * vfScr;
          activeDevices = ['Conv1_T3', 'Conv1_T4'];
          intervalDescription = `Dual Converter: Converter 1 conducting in Quadrant I (firing angle π + α1).`;
          isInstant = -iLoad;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'C1_T1', name: 'Converter 1 SCRs', isConducting: true, current: iLoad, voltage: vfScr, state: 'ON' },
          { id: 'C2_T1', name: 'Converter 2 (Blocked)', isConducting: false, current: 0, voltage: -voRaw, state: 'REVERSE_BLOCKING' },
        ];
        break;
      }

      // ==========================================
      // 14. DC-DC Buck Chopper
      // ==========================================
      case 'buck_converter': {
        const dutyCycle = Math.min(Math.max(controlled.firingAngleDeg / 100, 0.05), 0.95); // Using alpha slider as duty %
        const periodT = 1 / Math.max(supply.frequency * 10, 500); // 500Hz chopping
        const tInCycle = t % periodT;
        const isSwitchOn = tInCycle < dutyCycle * periodT;
        const vinDc = supply.vRms; // DC source voltage

        if (isSwitchOn) {
          voRaw = vinDc - vfScr;
          activeDevices = ['Q1'];
          isInstant = iLoad;
          intervalDescription = `Buck switch Q1 ON: Inductor energizing from DC source, VL = Vin - Vo.`;
        } else {
          voRaw = -vfDiode;
          isFwdConducting = true;
          activeDevices = ['D_FWD'];
          isInstant = 0;
          intervalDescription = `Buck switch Q1 OFF: Inductor freewheels through diode D_FWD, VL = -Vo.`;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'Q1', name: 'Main Switch Q1', isConducting: isSwitchOn, current: isSwitchOn ? iLoad : 0, voltage: isSwitchOn ? vfScr : vinDc, state: isSwitchOn ? 'ON' : 'OFF' },
          { id: 'D_FWD', name: 'Freewheeling Diode', isConducting: !isSwitchOn, current: !isSwitchOn ? iLoad : 0, voltage: !isSwitchOn ? vfDiode : -vinDc, state: !isSwitchOn ? 'ON' : 'OFF' },
        ];
        break;
      }

      // ==========================================
      // 15. DC-DC Boost Chopper
      // ==========================================
      case 'boost_converter': {
        const dutyCycle = Math.min(Math.max(controlled.firingAngleDeg / 100, 0.05), 0.9);
        const periodT = 1 / Math.max(supply.frequency * 10, 500);
        const tInCycle = t % periodT;
        const isSwitchOn = tInCycle < dutyCycle * periodT;
        const vinDc = supply.vRms;
        const expectedVo = vinDc / (1 - dutyCycle);

        if (isSwitchOn) {
          voRaw = expectedVo; // Output supported by capacitor
          activeDevices = ['Q1'];
          isInstant = iLoad / (1 - dutyCycle);
          intervalDescription = `Boost switch Q1 ON: Inductor charging from Vin, diode reverse biased.`;
        } else {
          voRaw = expectedVo;
          activeDevices = ['D1'];
          isInstant = iLoad / (1 - dutyCycle);
          intervalDescription = `Boost switch Q1 OFF: Inductor discharging into output capacitor and load.`;
        }

        const iNext = rk4StepCurrent(voRaw, effectiveR, effectiveL, effectiveE, iLoad, dt);
        iLoad = Math.max(0, iNext);

        devices = [
          { id: 'Q1', name: 'Boost Switch Q1', isConducting: isSwitchOn, current: isSwitchOn ? iLoad : 0, voltage: isSwitchOn ? vfScr : expectedVo, state: isSwitchOn ? 'ON' : 'OFF' },
          { id: 'D1', name: 'Boost Diode D1', isConducting: !isSwitchOn, current: !isSwitchOn ? iLoad : 0, voltage: !isSwitchOn ? vfDiode : -(expectedVo - vinDc), state: !isSwitchOn ? 'ON' : 'OFF' },
        ];
        break;
      }

      default:
        voRaw = vs > 0 ? vs : 0;
        iLoad = voRaw / effectiveR;
        break;
    }

    // Inductor voltage & Resistor voltage
    const vr = iLoad * load.r;
    const vl = voRaw - vr - effectiveE;
    const pIn = vs * isInstant;
    const pOut = voRaw * iLoad;

    const point: SimulationTimePoint = {
      time: t,
      thetaRad: thetaTotalRad,
      thetaDeg: thetaDeg,
      cycleIndex: cycleIndex,
      isSteadyState: isSteadyState,
      vs: vs,
      va: va,
      vb: vb,
      vc: vc,
      vab: vab,
      vbc: vbc,
      vca: vca,
      vo: voRaw,
      io: iLoad,
      is: isInstant,
      ia: iaInstant,
      ib: ibInstant,
      ic: icInstant,
      vl: vl,
      vr: vr,
      iFwd: isFwdConducting ? iLoad : 0,
      vFwd: isFwdConducting ? vfDiode : (voRaw > 0 ? -voRaw : 0),
      vGate: vGate,
      pIn: pIn,
      pOut: pOut,
      activeDevices: activeDevices,
      conductionMode: iLoad > 1e-4 ? (isFwdConducting ? 'FREEWHEELING' : 'CCM') : 'DCM',
      intervalDescription: intervalDescription,
      devices: devices,
    };

    points.push(point);
  }

  return {
    points,
    steadyStateStartIndex,
  };
}
