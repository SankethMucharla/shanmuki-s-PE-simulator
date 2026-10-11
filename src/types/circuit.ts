/**
 * Circuit Simulation and Analysis Type Definitions
 */

export type ConverterCategory =
  | '1ph_uncontrolled'
  | '1ph_controlled'
  | '3ph_uncontrolled'
  | '3ph_controlled'
  | 'advanced'
  | 'dc_chopper';

export type TopologyId =
  // 1-Phase Uncontrolled
  | '1ph_hw_diode'
  | '1ph_fw_ct'
  | '1ph_fw_bridge'
  // 3-Phase Uncontrolled
  | '3ph_hw_diode'
  | '3ph_fw_bridge'
  // 1-Phase Controlled
  | '1ph_hw_scr'
  | '1ph_fw_scr_bridge'
  | '1ph_semi_bridge'
  // 3-Phase Controlled
  | '3ph_hw_scr'
  | '3ph_fw_scr_bridge'
  | '3ph_semi_bridge'
  // Advanced & Extensible
  | '12_pulse_bridge'
  | 'dual_converter'
  | 'buck_converter'
  | 'boost_converter';

export type LoadType = 'R' | 'RL' | 'RLE';

export interface SupplyParams {
  vRms: number;          // Supply Phase RMS voltage (V), default 230V (1-phase) or 230V phase (400V line-to-line for 3-phase)
  frequency: number;     // Frequency in Hz, default 50Hz
  phaseOffsetDeg: number;// Initial phase angle (degrees), default 0
  rs: number;            // Source internal resistance (Ohms), default 0 (ideal) or 0.2 (practical)
  ls: number;            // Source internal inductance (H), default 0
}

export interface LoadParams {
  type: LoadType;
  r: number;             // Resistance (Ohms), default 20
  l: number;             // Inductance (H), default 0.05 (50 mH)
  e: number;             // Back EMF (V), default 30V
  initialCurrent: number;// Initial inductor current (A), default 0
}

export interface ControlledParams {
  firingAngleDeg: number;// Firing angle alpha (0 to 180 deg)
  pulseWidthDeg: number; // Gate pulse width in degrees (e.g. 10 deg)
  pulseAmpV: number;     // Gate pulse amplitude in Volts (e.g. 5V)
}

export interface PracticalParams {
  isPractical: boolean;  // Toggle ideal vs realistic
  diodeDrop: number;     // Diode forward drop (V), e.g. 0.8V
  scrDrop: number;       // SCR on-state voltage drop (V), e.g. 1.2V
  deviceRon: number;     // Device on-state slope resistance (Ohms), e.g. 0.05
  sourceR: number;       // Source resistance (Ohms)
}

export interface FreewheelingParams {
  enabled: boolean;
  isApplicable: boolean;
  reasonIfNot: string;
}

export interface SimulationConfig {
  topologyId: TopologyId;
  supply: SupplyParams;
  load: LoadParams;
  controlled: ControlledParams;
  practical: PracticalParams;
  fwd: FreewheelingParams;
  cyclesToSimulate: number; // e.g. 4 cycles (1 transient + 3 steady-state)
  pointsPerCycle: number;   // e.g. 1000 points
}

export interface DeviceState {
  id: string;            // e.g. 'D1', 'T1', 'FWD'
  name: string;          // e.g. 'Diode D1'
  isConducting: boolean;
  current: number;       // instantaneous current through device
  voltage: number;       // anode-to-cathode voltage
  state: 'ON' | 'OFF' | 'FORWARD_BLOCKING' | 'REVERSE_BLOCKING' | 'TRIGGERED';
}

export interface SimulationTimePoint {
  time: number;          // seconds
  thetaRad: number;      // omega * t in radians
  thetaDeg: number;      // modulo 360 deg or total deg
  cycleIndex: number;
  isSteadyState: boolean;

  // Supply voltages
  vs: number;            // 1-phase or Phase A voltage
  va?: number;           // 3-phase Phase A
  vb?: number;           // 3-phase Phase B
  vc?: number;           // 3-phase Phase C
  vab?: number;          // 3-phase Line-to-Line Vab
  vbc?: number;          // 3-phase Line-to-Line Vbc
  vca?: number;          // 3-phase Line-to-Line Vca

  // Rectifier outputs
  vo: number;            // Instantaneous output voltage across load terminals
  io: number;            // Instantaneous load current
  is: number;            // Instantaneous source current (Phase A)
  ia?: number;
  ib?: number;
  ic?: number;

  // Inductor and Back EMF
  vl: number;            // Voltage across inductor: L * di/dt
  vr: number;            // Voltage across resistor: R * io

  // Freewheeling diode
  iFwd: number;
  vFwd: number;

  // Gate pulse logic
  vGate: number;         // Logical gate pulse (1 or 0, or pulse amplitude)

  // Power
  pIn: number;           // Instantaneous input power
  pOut: number;          // Instantaneous output power

  // Conduction & Devices
  activeDevices: string[];
  conductionMode: 'CCM' | 'DCM' | 'FREEWHEELING' | 'ZERO_CURRENT';
  intervalDescription: string;
  devices: DeviceState[];
}

export interface HarmonicComponent {
  harmonic: number;      // 1, 2, 3, 4, 5, ...
  frequencyHz: number;
  magnitude: number;     // peak
  rms: number;
  percentageOfFundamental: number;
  phaseRad: number;
}

export interface HarmonicAnalysisResult {
  fundamentalRms: number;
  fundamentalPhaseDeg: number;
  displacementFactor: number; // cos(phi1)
  distortionFactor: number;   // I1_rms / Is_rms
  truePowerFactor: number;    // DPF * DF
  thdCurrentPercent: number;  // THD_i %
  harmonics: HarmonicComponent[];
}

export interface CircuitMetrics {
  voAvg: number;         // Average DC output voltage
  voRms: number;         // RMS output voltage
  ioAvg: number;         // Average load current
  ioRms: number;         // RMS load current
  ioPeak: number;        // Peak load current
  isRms: number;         // Input source current RMS
  pDc: number;           // DC output power: Vo_avg * Io_avg
  pOutActive: number;    // True active output power: 1/T * integral(vo * io)
  pInActive: number;     // True active input power: 1/T * integral(vs * is)
  efficiencyPercent: number;
  formFactor: number;    // Vo_rms / Vo_avg
  voltageRippleFactor: number; // sqrt(FF^2 - 1)
  currentRippleFactor: number; // sqrt( (Io_rms/Io_avg)^2 - 1 )
  conductionMode: 'CCM' | 'DCM';
  extinctionAngleBetaDeg?: number;
  peakInverseVoltage: number;
  transformerUtilizationFactor?: number;
}

export interface TheoreticalResult {
  voAvg: number;
  voRms: number;
  ioAvg: number;
  ioRms: number;
  formFactor: number;
  rippleFactor: number;
  peakInverseVoltage: number;
  pDc: number;
  truePowerFactor?: number;
  conductionMode: 'CCM' | 'DCM' | 'PURE_R';
  formulaVoAvg: string;
  formulaVoRms: string;
  assumptions: string[];
}

export interface TheoryComparisonItem {
  parameter: string;
  unit: string;
  theoretical: number;
  simulated: number;
  errorPercent: number;
  formula: string;
  notes: string;
}

export interface SimulationResult {
  config: SimulationConfig;
  points: SimulationTimePoint[];
  steadyStateStartIndex: number;
  metrics: CircuitMetrics;
  harmonics: HarmonicAnalysisResult;
  theoretical: TheoreticalResult;
  comparison: TheoryComparisonItem[];
}

export interface TopologyDefinition {
  id: TopologyId;
  name: string;
  category: ConverterCategory;
  shortDescription: string;
  fullDescription: string;
  isControlled: boolean;
  phaseCount: 1 | 3;
  devices: string[];
  fwdCapability: {
    canHaveFwd: boolean;
    reasonWhenDisabled: string;
    naturalFreewheelingInherent: boolean;
  };
  defaultAlpha: number;
  advantages: string[];
  disadvantages: string[];
  applications: string[];
  theoryNotes: string[];
}
