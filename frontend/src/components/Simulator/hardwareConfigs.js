// ═══════════════════════════════════════════════════════════════
// LAYER-2: HARDWARE / ELECTRONICS TWIN — DEVICE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════
// Block-level electronics architecture configs.
// NOT PCB, pin-level, SPICE, or CAD — this is SoC / schematic-style.

const HW_CONFIGS = {

    // ─────────────────────────────────────────────────────────────
    // CLASS I — PULSE OXIMETER (Simple)
    // ─────────────────────────────────────────────────────────────
    pulse_ox: {
        label: 'Pulse Oximeter — Layer-2 Electronics',
        classLabel: 'CLASS I',
        provenance: 'Derived from Design Graph v1.0',

        powerDomains: [
            { id: 'pd_main', label: 'VCC 3.3V (Primary)', x: 20, y: 20, w: 680, h: 330, color: '#38bdf820', borderColor: '#38bdf830' },
        ],

        blocks: [
            { id: 'psu', label: 'Power Supply', sublabel: '3.3V LDO', x: 40, y: 60, w: 120, h: 80, type: 'power', domain: 'pd_main', systemLink: null },
            { id: 'mcu', label: 'MCU', sublabel: 'ARM Cortex-M0', x: 290, y: 140, w: 140, h: 100, type: 'control', domain: 'pd_main', systemLink: 'signal_processor' },
            { id: 'led_drv', label: 'LED Driver', sublabel: 'Red/IR Mux', x: 40, y: 180, w: 120, h: 80, type: 'driver', domain: 'pd_main', systemLink: 'led_emitter' },
            { id: 'adc', label: 'Photodiode ADC', sublabel: '16-bit SAR', x: 540, y: 180, w: 120, h: 80, type: 'sensor', domain: 'pd_main', systemLink: 'photo_detector' },
            { id: 'display', label: 'Display / BLE', sublabel: 'Output', x: 540, y: 60, w: 120, h: 80, type: 'output', domain: 'pd_main', systemLink: null },
        ],

        buses: [
            { from: [160, 100], to: [290, 100], to2: [290, 140], label: 'VCC Rail', type: 'power', color: '#f59e0b' },
            { from: [160, 220], to: [290, 220], label: 'SPI Ctrl', type: 'data', color: '#38bdf8' },
            { from: [430, 220], to: [540, 220], label: 'SPI Data', type: 'data', color: '#38bdf8' },
            { from: [430, 170], to: [540, 100], label: 'I2C', type: 'data', color: '#2dd4bf' },
            { from: [100, 260], to: [100, 300], to2: [600, 300], to3: [600, 260], label: 'Optical Path', type: 'signal', color: '#a78bfa' },
        ],

        faults: [
            { id: 'psu_fail', label: 'Power Loss', severity: 'critical', affectedDomain: 'pd_main', affectedBlocks: ['psu', 'mcu', 'led_drv', 'adc', 'display'], reference: 'IEC 60601-1 §8.11', response: 'Complete system shutdown' },
            { id: 'spi_fail', label: 'SPI Bus Failure', severity: 'warning', affectedDomain: null, affectedBlocks: ['led_drv', 'adc'], reference: 'ISO 80601-2-61 §201.12', response: 'LED/ADC communication lost — no reading' },
            { id: 'adc_noise', label: 'ADC Noise', severity: 'warning', affectedDomain: null, affectedBlocks: ['adc'], reference: 'IEC 60601-1 §8.7', response: 'Signal quality degraded' },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // CLASS II — VENTILATOR (Moderate)
    // ─────────────────────────────────────────────────────────────
    ventilator: {
        label: 'Ventilator — Layer-2 Electronics',
        classLabel: 'CLASS II',
        provenance: 'Derived from Design Graph v1.0',

        powerDomains: [
            { id: 'pd_primary', label: 'VCC 12V (Primary)', x: 20, y: 20, w: 460, h: 340, color: '#38bdf815', borderColor: '#38bdf830' },
            { id: 'pd_backup', label: 'VBAT 12V (Backup)', x: 500, y: 20, w: 220, h: 340, color: '#f59e0b12', borderColor: '#f59e0b30' },
        ],

        blocks: [
            { id: 'psu_pri', label: 'Primary PSU', sublabel: '12V / 5V / 3.3V', x: 40, y: 55, w: 130, h: 70, type: 'power', domain: 'pd_primary', systemLink: null },
            { id: 'psu_bak', label: 'Backup Battery', sublabel: 'UPS 12V Li-Ion', x: 530, y: 55, w: 160, h: 70, type: 'power', domain: 'pd_backup', systemLink: null },
            { id: 'mcu', label: 'MCU', sublabel: 'ARM Cortex-M4', x: 220, y: 60, w: 140, h: 90, type: 'control', domain: 'pd_primary', systemLink: null },
            { id: 'motor_drv', label: 'Motor Driver', sublabel: 'H-Bridge PWM', x: 40, y: 180, w: 130, h: 80, type: 'driver', domain: 'pd_primary', systemLink: 'blower_motor' },
            { id: 'press_adc', label: 'Pressure ADC', sublabel: '24-bit ΔΣ', x: 220, y: 200, w: 130, h: 70, type: 'sensor', domain: 'pd_primary', systemLink: 'pressure_sensor' },
            { id: 'flow_adc', label: 'Flow ADC', sublabel: '16-bit SAR', x: 390, y: 200, w: 100, h: 70, type: 'sensor', domain: 'pd_primary', systemLink: 'flow_sensor' },
            { id: 'safety_ic', label: 'Safety Cut-Off IC', sublabel: 'Watchdog + Relay', x: 530, y: 180, w: 160, h: 80, type: 'safety', domain: 'pd_backup', systemLink: 'safety_monitor' },
            { id: 'alarm', label: 'Alarm Buzzer', sublabel: 'Piezo 85dB', x: 530, y: 290, w: 160, h: 50, type: 'output', domain: 'pd_backup', systemLink: null },
        ],

        buses: [
            { from: [170, 90], to: [220, 90], label: '5V', type: 'power', color: '#f59e0b' },
            { from: [170, 220], to: [220, 220], label: 'PWM', type: 'timing', color: '#c084fc' },
            { from: [350, 235], to: [390, 235], label: 'SPI', type: 'data', color: '#38bdf8' },
            { from: [360, 150], to: [530, 220], label: 'INT', type: 'signal', color: '#f43f5e' },
            { from: [360, 105], to: [530, 90], label: 'VBAT SW', type: 'power', color: '#f59e0b' },
            { from: [610, 260], to: [610, 290], label: 'GPIO', type: 'signal', color: '#2dd4bf' },
            // Timing annotation
            { from: [105, 260], to: [290, 260], to2: [290, 270], label: '< 10ms Control Loop', type: 'timing', color: '#c084fc' },
        ],

        faults: [
            { id: 'pri_power', label: 'Primary Power Loss', severity: 'critical', affectedDomain: 'pd_primary', affectedBlocks: ['psu_pri', 'mcu', 'motor_drv', 'press_adc', 'flow_adc'], reference: 'IEC 60601-1 §8.11', response: 'Switchover to backup battery' },
            { id: 'brownout', label: 'Power Brownout', severity: 'warning', affectedDomain: 'pd_primary', affectedBlocks: ['motor_drv'], reference: 'IEC 60601-1 §8.11.1', response: 'Motor performance degraded' },
            { id: 'pwm_fail', label: 'PWM Bus Failure', severity: 'critical', affectedDomain: null, affectedBlocks: ['motor_drv'], reference: 'ISO 80601-2-12 §201.12', response: 'Motor stalled — emergency vent mode' },
            { id: 'timing_miss', label: 'Control Loop Timeout', severity: 'warning', affectedDomain: null, affectedBlocks: ['mcu', 'press_adc', 'flow_adc'], reference: 'ISO 80601-2-12 §201.13', response: 'Loop deadline exceeded 10ms — safety alert' },
            { id: 'watchdog', label: 'Watchdog Reset', severity: 'critical', affectedDomain: null, affectedBlocks: ['mcu', 'safety_ic'], reference: 'IEC 60601-1 §8.4', response: 'MCU reset — safety relay engaged' },
        ],
    },

    // ─────────────────────────────────────────────────────────────
    // CLASS III — HEMODIALYSIS (Most Rigorous)
    // ─────────────────────────────────────────────────────────────
    dialysis: {
        label: 'Hemodialysis — Layer-2 Electronics',
        classLabel: 'CLASS III',
        provenance: 'Derived from Design Graph v1.0',

        powerDomains: [
            { id: 'pd_primary', label: 'VCC 24V (Primary)', x: 20, y: 20, w: 310, h: 200, color: '#38bdf812', borderColor: '#38bdf825' },
            { id: 'pd_backup', label: 'VBAT 24V (Backup)', x: 20, y: 240, w: 310, h: 140, color: '#f59e0b10', borderColor: '#f59e0b25' },
            { id: 'pd_safety', label: 'VSAFE (Isolated Safety Rail)', x: 350, y: 20, w: 370, h: 360, color: '#f43f5e08', borderColor: '#f43f5e20' },
        ],

        blocks: [
            // Primary domain
            { id: 'psu_pri', label: 'Primary PSU', sublabel: '24V / 5V / 3.3V', x: 40, y: 50, w: 130, h: 65, type: 'power', domain: 'pd_primary', systemLink: null },
            { id: 'mcu', label: 'Control Unit', sublabel: 'ARM Cortex-M7', x: 190, y: 50, w: 120, h: 65, type: 'control', domain: 'pd_primary', systemLink: null },
            { id: 'blood_drv', label: 'Blood Pump Drv', sublabel: 'BLDC Controller', x: 40, y: 140, w: 130, h: 60, type: 'driver', domain: 'pd_primary', systemLink: 'blood_pump' },
            { id: 'dialysate_drv', label: 'Dialysate Pump Drv', sublabel: 'Stepper Driver', x: 190, y: 140, w: 120, h: 60, type: 'driver', domain: 'pd_primary', systemLink: 'dialysate_pump' },
            // Backup domain
            { id: 'psu_bak', label: 'Backup UPS', sublabel: 'Li-Ion 24V', x: 40, y: 270, w: 130, h: 55, type: 'power', domain: 'pd_backup', systemLink: null },
            { id: 'clamp_drv', label: 'Clamp Actuator', sublabel: 'Solenoid Driver', x: 190, y: 270, w: 120, h: 55, type: 'safety', domain: 'pd_backup', systemLink: null },
            // Safety domain (isolated)
            { id: 'safety_ctrl', label: 'Safety Controller', sublabel: 'Dedicated MCU', x: 380, y: 50, w: 150, h: 65, type: 'safety', domain: 'pd_safety', systemLink: 'safety_monitor' },
            { id: 'air_det', label: 'Air Detector ADC', sublabel: 'Ultrasonic 20-bit', x: 560, y: 50, w: 130, h: 65, type: 'sensor', domain: 'pd_safety', systemLink: null },
            { id: 'tmp_adc', label: 'TMP Sensor ADC', sublabel: '24-bit ΔΣ', x: 380, y: 145, w: 150, h: 55, type: 'sensor', domain: 'pd_safety', systemLink: 'tmp_sensor' },
            { id: 'temp_adc', label: 'Temp Sensor ADC', sublabel: 'RTD Interface', x: 560, y: 145, w: 130, h: 55, type: 'sensor', domain: 'pd_safety', systemLink: 'temp_sensor' },
            { id: 'leak_det', label: 'Blood Leak Det.', sublabel: 'Optical Sensor', x: 380, y: 230, w: 150, h: 55, type: 'sensor', domain: 'pd_safety', systemLink: null },
            { id: 'alarm_ic', label: 'Alarm Controller', sublabel: 'Multi-lvl Buzzer', x: 560, y: 230, w: 130, h: 55, type: 'output', domain: 'pd_safety', systemLink: null },
            { id: 'interlock', label: 'Interlock Logic', sublabel: 'CPLD / FPGA', x: 470, y: 315, w: 130, h: 50, type: 'safety', domain: 'pd_safety', systemLink: null },
        ],

        buses: [
            // Power rails
            { from: [170, 82], to: [190, 82], label: '5V', type: 'power', color: '#f59e0b' },
            { from: [170, 170], to: [190, 170], label: '24V Motor', type: 'power', color: '#f59e0b' },
            { from: [170, 298], to: [190, 298], label: 'VBAT', type: 'power', color: '#f59e0b' },
            // Data buses
            { from: [310, 82], to: [380, 82], label: 'SPI Safe', type: 'data', color: '#38bdf8' },
            { from: [530, 82], to: [560, 82], label: 'UART', type: 'data', color: '#38bdf8' },
            { from: [455, 115], to: [455, 145], label: 'I2C', type: 'data', color: '#2dd4bf' },
            { from: [625, 115], to: [625, 145], label: 'I2C', type: 'data', color: '#2dd4bf' },
            // Safety / interlock paths
            { from: [455, 285], to: [470, 340], label: 'LEAK INT', type: 'signal', color: '#f43f5e' },
            { from: [535, 340], to: [600, 340], to2: [625, 285], label: 'ALARM', type: 'signal', color: '#f43f5e' },
            // Emergency clamp path
            { from: [380, 82], to: [350, 82], to2: [350, 298], to3: [190, 298], label: 'E-CLAMP', type: 'signal', color: '#f43f5e' },
            // MCU to drivers
            { from: [250, 115], to: [250, 140], label: 'CAN', type: 'data', color: '#38bdf8' },
            { from: [105, 115], to: [105, 140], label: 'PWM', type: 'timing', color: '#c084fc' },
        ],

        faults: [
            { id: 'pri_power', label: 'Primary Power Loss', severity: 'critical', affectedDomain: 'pd_primary', affectedBlocks: ['psu_pri', 'mcu', 'blood_drv', 'dialysate_drv'], reference: 'IEC 60601-1 §8.11', response: 'UPS switchover — safety controller takes over' },
            { id: 'safety_power', label: 'Safety Rail Failure', severity: 'critical', affectedDomain: 'pd_safety', affectedBlocks: ['safety_ctrl', 'air_det', 'tmp_adc', 'temp_adc', 'leak_det', 'alarm_ic', 'interlock'], reference: 'ISO 8637 §5.3', response: 'Emergency shutdown — all clamps engaged' },
            { id: 'can_fail', label: 'CAN Bus Failure', severity: 'critical', affectedDomain: null, affectedBlocks: ['mcu', 'dialysate_drv'], reference: 'ISO 8637 §5.4', response: 'Dialysate pump halted' },
            { id: 'air_det_fail', label: 'Air Detector Offline', severity: 'critical', affectedDomain: null, affectedBlocks: ['air_det', 'interlock'], reference: 'ISO 8637 §5.3.1', response: 'Blood circuit clamped — treatment stopped' },
            { id: 'timing_miss', label: 'Safety Loop Timeout', severity: 'warning', affectedDomain: null, affectedBlocks: ['safety_ctrl', 'tmp_adc'], reference: 'ISO 8637 §5.5', response: 'Safety loop deadline exceeded 5ms' },
            { id: 'leak_alarm', label: 'Blood Leak Detected', severity: 'critical', affectedDomain: null, affectedBlocks: ['leak_det', 'alarm_ic', 'interlock', 'clamp_drv'], reference: 'ISO 8637 §5.3.2', response: 'Blood leak alarm — emergency clamp' },
        ],
    },
};

export default HW_CONFIGS;
