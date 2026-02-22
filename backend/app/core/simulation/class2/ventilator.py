from ..base import BaseDigitalTwin


class VentilatorTwin(BaseDigitalTwin):
    """
    Digital Twin for Class II Ventilator — L2 closed-loop model.

    Parameters are requirement-driven:
      target_flow_rate  — set-point derived from performance requirements
      max_flow_rate     — upper safety limit from performance requirements
      max_pressure      — upper safety limit from safety requirements

    Dynamics (L2 — first-order linear model):
      RPM adjusts toward the set-point each step using a proportional
      gain (simple P-controller approximation). This produces a
      time-varying output so compliance and safety checks have
      meaningful inputs rather than a constant value.

    Limit flags are set when safety thresholds are crossed.
    """

    # Physical constants (device-class level, not per-requirement)
    _RPM_PER_LPM  = 20.0   # RPM needed per L/min of flow
    _PRESSURE_GAIN = 0.20  # cmH2O per L/min
    _KP           = 0.15   # proportional gain for RPM tracking

    def __init__(
        self,
        target_flow_rate: float = 30.0,  # L/min
        max_flow_rate:    float = 60.0,  # L/min  (from requirement)
        max_pressure:     float = 40.0,  # cmH2O  (from requirement)
        fidelity: str = "L2"
    ):
        super().__init__(fidelity)
        self.target_flow_rate = target_flow_rate
        self.max_flow_rate    = max_flow_rate
        self.max_pressure     = max_pressure

        # Component Modes
        self.component_modes = {
            "Flow Sensor": "Ideal",
            "Pressure Sensor": "Ideal",
            "Blower Motor": "Ideal",
            "Safety Monitor": "Active"
        }

        # State
        self.motor_rpm   = 0.0
        self.flow_rate   = 0.0
        self.pressure    = 0.0
        
        # Raw physical values (pre-sensor)
        self.physics_flow = 0.0
        self.physics_pressure = 0.0

        # Limit flags (set when a safety threshold is exceeded)
        self.pressure_limit_exceeded  = False
        self.flow_rate_limit_exceeded = False

    # ── Simulation step ────────────────────────────────────────────
    def step(self) -> dict:
        """
        One simulation tick (Δt = 1 virtual second).
        """
        import random

        # Motor behavior
        motor_bias = 1.0
        if self.component_modes["Blower Motor"] == "Degraded":
            motor_bias = 0.8
        elif self.component_modes["Blower Motor"] == "Failed":
            motor_bias = 0.0

        target_rpm = self.target_flow_rate * self._RPM_PER_LPM
        rpm_error  = target_rpm - self.motor_rpm
        self.motor_rpm = max(0.0, self.motor_rpm + (self._KP * rpm_error * motor_bias))

        self.physics_flow = self.motor_rpm / self._RPM_PER_LPM
        
        # Pressure calculation
        if self.fidelity == "L3":
            resistance = 5.0 
            compliance = 0.05 
            volume = self.physics_flow / 60.0 
            self.physics_pressure = (self.physics_flow / resistance) + (volume / compliance)
        else:
            self.physics_pressure = self.physics_flow * self._PRESSURE_GAIN

        # Sensor interpretation (with noise/faults)
        self.flow_rate = self.physics_flow
        if self.component_modes["Flow Sensor"] == "Noisy":
            self.flow_rate += random.uniform(-2.0, 2.0)
        elif self.component_modes["Flow Sensor"] == "Failed":
            self.flow_rate = 0.0

        self.pressure = self.physics_pressure
        if self.component_modes["Pressure Sensor"] == "Noisy":
            self.pressure += random.uniform(-1.0, 1.0)
        elif self.component_modes["Pressure Sensor"] == "Failed":
            self.pressure = -1.0 # Stuck low

        # Evaluate safety limits
        self.pressure_limit_exceeded  = self.pressure  > self.max_pressure
        self.flow_rate_limit_exceeded = self.flow_rate > self.max_flow_rate

        return {
            "MotorRPM":               round(self.motor_rpm, 2),
            "FlowRate(L/min)":        round(self.flow_rate, 2),
            "Pressure(cmH2O)":        round(self.pressure, 2),
            "TargetFlowRate(L/min)":  self.target_flow_rate,
            "PressureLimitExceeded":  self.pressure_limit_exceeded,
            "FlowRateLimitExceeded":  self.flow_rate_limit_exceeded,
        }

    # ── Parameter update (for what-if / fault injection) ───────────
    def set_target_flow_rate(self, value: float):
        """Update the flow set-point at runtime (what-if analysis)."""
        self.target_flow_rate = value

    def set_max_pressure(self, value: float):
        """Override safety pressure threshold (for sensitivity tests)."""
        self.max_pressure = value