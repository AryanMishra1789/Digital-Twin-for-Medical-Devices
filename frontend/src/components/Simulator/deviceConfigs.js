import { Shield, Cpu, Zap, Package, Power, RefreshCw, Gauge, Droplets, Thermometer, Heart } from 'lucide-react';

const STANDARDS = {
    ventilator: { primary: 'IEC 60601-1', safety: 'ISO 80601-2-12' },
    dialysis: { primary: 'IEC 60601-1', safety: 'ISO 8637' },
    pulse_ox: { primary: 'IEC 60601-1', safety: 'ISO 80601-2-61' },
};

const DEVICE_CONFIGS = {
    ventilator: {
        label: 'Ventilator — Class II Digital Twin',
        classLabel: 'CLASS II',
        standard: STANDARDS.ventilator,
        components: [
            { id: 'flow_sensor', name: 'Flow Sensor', icon: RefreshCw, archBlockId: 'sensors' },
            { id: 'pressure_sensor', name: 'Pressure Sensor', icon: Gauge, archBlockId: 'sensors' },
            { id: 'blower_motor', name: 'Blower Motor', icon: Power, archBlockId: 'actuator' },
            { id: 'safety_monitor', name: 'Safety Monitor', icon: Shield, archBlockId: 'safety' },
        ],
        defaultModes: {
            "Flow Sensor": "Ideal", "Pressure Sensor": "Ideal",
            "Blower Motor": "Ideal", "Safety Monitor": "Active"
        },
        controlModes: ['Pressure Control', 'Volume Control'],
        params: { target_flow_rate: 30, max_pressure: 40 },
        sliders: [
            { key: 'target_flow_rate', label: 'Target Flow Rate', unit: 'LPM', min: 10, max: 100, color: 'sky' },
            { key: 'max_pressure', label: 'Safety Pressure Limit', unit: 'cmH2O', min: 20, max: 60, color: 'rose', isThreshold: true },
        ],
        metrics: [
            { key: 'FlowRate(L/min)', color: '#38bdf8', label: 'Flow (LPM)' },
            { key: 'Pressure(cmH2O)', color: '#2dd4bf', label: 'Pressure (cmH2O)', thresholdParam: 'max_pressure' },
            { key: 'MotorRPM', color: '#f43f5e', label: 'Motor RPM' },
        ],
        archBlocks: [
            { id: 'sensors', label: 'Sensors', sublabel: 'FlowRate(L/min)', unit: 'LPM', x: 40, y: 140, w: 130, h: 100 },
            { id: 'control', label: 'PID Controller', sublabel: 'MotorRPM', unit: 'RPM', x: 260, y: 140, w: 200, h: 100 },
            { id: 'actuator', label: 'Blower Motor', sublabel: 'Pressure(cmH2O)', unit: 'cmH2O', x: 550, y: 140, w: 130, h: 100 },
            { id: 'safety', label: 'Safety Monitor', sublabel: null, x: 290, y: 30, w: 160, h: 70, isSafety: true },
        ],
        archConnections: [
            { from: [170, 190], to: [260, 190], label: 'Signal' },
            { from: [460, 190], to: [550, 190], label: 'Drive' },
            { from: [370, 140], to: [370, 100], label: 'Override' },
        ],
        feedbackLoop: { from: [615, 240], mid1: [615, 320], mid2: [105, 320], to: [105, 240], label: 'Feedback' },
        faults: [
            { label: 'Sensor Stuck High', param: 'flow_rate', bias: 0.5, severity: 'warning', response: 'Flow reading frozen — clinician alert', reference: 'ISO 80601-2-12 §201.12.1' },
            { label: 'Total Power Fail', param: 'motor_rpm', bias: -1.0, severity: 'critical', response: 'Emergency ventilation mode', reference: 'IEC 60601-1 §8.11' },
            { label: 'Pressure Spike', param: 'pressure', bias: 0.8, severity: 'critical', response: 'Pressure relief valve opened', reference: 'ISO 80601-2-12 §201.13' },
            { label: 'Sensor Noise', param: 'flow_rate', bias: 0.2, severity: 'warning', response: 'Signal filter engaged', reference: 'IEC 60601-1 §8.4' },
        ],
    },
    dialysis: {
        label: 'Hemodialysis — Class III Digital Twin',
        classLabel: 'CLASS III',
        standard: STANDARDS.dialysis,
        components: [
            { id: 'blood_pump', name: 'Blood Pump', icon: Heart, archBlockId: 'blood_pump' },
            { id: 'dialysate_pump', name: 'Dialysate Pump', icon: Droplets, archBlockId: 'dialysate_supply' },
            { id: 'tmp_sensor', name: 'TMP Sensor', icon: Gauge, archBlockId: 'dialyzer' },
            { id: 'temp_sensor', name: 'Temperature Sensor', icon: Thermometer, archBlockId: 'temp_ctrl' },
            { id: 'safety_monitor', name: 'Safety Monitor', icon: Shield, archBlockId: 'safety_air' },
        ],
        defaultModes: {
            "Blood Pump": "Ideal", "Dialysate Pump": "Ideal",
            "TMP Sensor": "Ideal", "Temperature Sensor": "Ideal",
            "Safety Monitor": "Active"
        },
        controlModes: null,
        params: { target_bfr: 300, max_tmp: 500 },
        sliders: [
            { key: 'target_bfr', label: 'Blood Flow Rate', unit: 'mL/min', min: 100, max: 500, color: 'sky' },
            { key: 'max_tmp', label: 'Max TMP', unit: 'mmHg', min: 200, max: 800, color: 'rose', isThreshold: true },
        ],
        metrics: [
            { key: 'BloodFlowRate(mL/min)', color: '#f43f5e', label: 'Blood Flow (mL/min)' },
            { key: 'DialysateFlowRate(mL/min)', color: '#38bdf8', label: 'Dialysate Flow' },
            { key: 'TMP(mmHg)', color: '#fbbf24', label: 'TMP (mmHg)', thresholdParam: 'max_tmp' },
        ],
        archBlocks: [
            { id: 'blood_pump', label: 'Blood Pump', sublabel: 'BloodFlowRate(mL/min)', unit: 'mL/min', x: 30, y: 80, w: 130, h: 90, circuit: 'blood' },
            { id: 'dialyzer', label: 'Dialyzer', sublabel: 'TMP(mmHg)', unit: 'mmHg', x: 260, y: 55, w: 180, h: 130, circuit: 'shared' },
            { id: 'patient_return', label: 'Patient Return', sublabel: null, x: 550, y: 80, w: 120, h: 90, circuit: 'blood' },
            { id: 'dialysate_supply', label: 'Dialysate Supply', sublabel: 'DialysateFlowRate(mL/min)', unit: 'mL/min', x: 30, y: 240, w: 140, h: 80, circuit: 'dialysate' },
            { id: 'temp_ctrl', label: 'Temp Control', sublabel: 'Temperature(C)', unit: '°C', x: 550, y: 240, w: 120, h: 80, circuit: 'dialysate' },
            { id: 'safety_air', label: 'Air Detector', sublabel: null, x: 180, y: 10, w: 110, h: 45, isSafety: true, circuit: 'blood' },
            { id: 'safety_leak', label: 'Blood Leak Det.', sublabel: null, x: 460, y: 10, w: 120, h: 45, isSafety: true, circuit: 'blood' },
        ],
        archConnections: [
            { from: [160, 125], to: [260, 125], color: '#f43f5e40' },
            { from: [440, 125], to: [550, 125], color: '#f43f5e40' },
            { from: [170, 280], to: [260, 170], color: '#38bdf840' },
            { from: [440, 170], to: [550, 280], color: '#38bdf840' },
        ],
        emergencyPaths: [
            { from: [235, 55], to: [95, 80], label: 'CLAMP', color: '#f43f5e' },
            { from: [520, 55], to: [610, 80], label: 'STOP', color: '#f43f5e' },
        ],
        faults: [
            { label: 'Air Bubble', param: 'blood_flow_rate', bias: -0.3, severity: 'critical', response: 'Emergency clamp engaged — blood circuit stopped', reference: 'ISO 8637 §5.3.1' },
            { label: 'TMP Alarm', param: 'tmp', bias: 0.8, severity: 'critical', response: 'Ultrafiltration halted — TMP limit exceeded', reference: 'ISO 8637 §5.5' },
            { label: 'Blood Leak', param: 'dialysate_flow_rate', bias: -0.5, severity: 'critical', response: 'Blood leak detected — treatment stopped', reference: 'ISO 8637 §5.3.2' },
            { label: 'Heater Fail', param: 'temperature', bias: -0.4, severity: 'warning', response: 'Dialysate temperature out of range', reference: 'ISO 8637 §5.4' },
        ],
    },
    pulse_ox: {
        label: 'Pulse Oximeter — Class I Digital Twin',
        classLabel: 'CLASS I',
        standard: STANDARDS.pulse_ox,
        components: [
            { id: 'led_emitter', name: 'LED Emitter', icon: Zap, archBlockId: 'emitter' },
            { id: 'photo_detector', name: 'Photo Detector', icon: RefreshCw, archBlockId: 'emitter' },
            { id: 'signal_processor', name: 'Signal Processor', icon: Cpu, archBlockId: 'processor' },
            { id: 'safety_monitor', name: 'Safety Monitor', icon: Shield, archBlockId: 'safety' },
        ],
        defaultModes: {
            "LED Emitter": "Ideal", "Photo Detector": "Ideal",
            "Signal Processor": "Ideal", "Safety Monitor": "Active"
        },
        controlModes: null,
        params: { target_spo2: 98, min_spo2: 90 },
        sliders: [
            { key: 'target_spo2', label: 'Target SpO2', unit: '%', min: 85, max: 100, color: 'sky' },
            { key: 'min_spo2', label: 'Low SpO2 Alarm', unit: '%', min: 80, max: 95, color: 'rose', isThreshold: true },
        ],
        metrics: [
            { key: 'SpO2(%)', color: '#38bdf8', label: 'SpO2 (%)', thresholdParam: 'min_spo2', thresholdDir: 'below' },
            { key: 'PulseRate(bpm)', color: '#f43f5e', label: 'Pulse Rate (bpm)' },
            { key: 'SignalQuality(%)', color: '#2dd4bf', label: 'Signal Quality' },
        ],
        archBlocks: [
            { id: 'emitter', label: 'LED / Photodiode', sublabel: 'SpO2(%)', unit: '%', x: 40, y: 140, w: 140, h: 100 },
            { id: 'processor', label: 'Signal Processor', sublabel: 'PulseRate(bpm)', unit: 'bpm', x: 260, y: 140, w: 200, h: 100 },
            { id: 'display', label: 'Display Output', sublabel: 'SignalQuality(%)', unit: '%', x: 540, y: 140, w: 130, h: 100 },
            { id: 'safety', label: 'Low SpO2 Alarm', sublabel: null, x: 290, y: 35, w: 160, h: 65, isSafety: true },
        ],
        archConnections: [
            { from: [180, 190], to: [260, 190], label: 'Raw' },
            { from: [460, 190], to: [540, 190], label: 'Processed' },
            { from: [370, 140], to: [370, 100], label: 'Alarm' },
        ],
        faults: [
            { label: 'Probe Disconnect', param: 'spo2', bias: -1.0, severity: 'critical', response: 'Probe removed — no signal', reference: 'ISO 80601-2-61 §201.12' },
            { label: 'Motion Artifact', param: 'spo2', bias: 0.15, severity: 'warning', response: 'Motion detected — reading unreliable', reference: 'ISO 80601-2-61 §201.7' },
            { label: 'Ambient Light', param: 'signal_quality', bias: -0.5, severity: 'warning', response: 'Ambient light interference', reference: 'IEC 60601-1 §8.7' },
            { label: 'Low Perfusion', param: 'pulse_rate', bias: -0.3, severity: 'warning', response: 'Low perfusion index — weak signal', reference: 'ISO 80601-2-61 §201.12.1' },
        ],
    }
};

export default DEVICE_CONFIGS;
