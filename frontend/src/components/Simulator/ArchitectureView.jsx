import React from 'react';
import { Activity, Shield, Cpu, Gauge, Zap } from 'lucide-react';

export default function ArchitectureView({ snapshots, activeComponent }) {
    const latest = snapshots?.[snapshots.length - 1]?.values || {};

    const getStatusClass = (comp) => {
        if (latest.PressureLimitExceeded || latest.FlowRateLimitExceeded) return 'eng-status-fault';
        return 'eng-status-active';
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={14} className="text-sky-400" /> System Architecture
                </h3>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <Zap size={10} /> Live
                    </span>
                </div>
            </div>

            <div className="flex-1 relative eng-grid rounded-xl border border-slate-800/50 overflow-hidden bg-slate-950/20">
                <div className="scanline"></div>

                {/* SVG Diagram Layer */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                        </marker>
                    </defs>

                    {/* Connections */}
                    <path d="M 150 200 L 250 200" stroke="#334155" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
                    <path d="M 450 200 L 550 200" stroke="#334155" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />

                    {/* Blocks */}
                    {/* Sensors */}
                    <g transform="translate(50, 150)">
                        <rect width="100" height="100" rx="12" className={`fill-slate-900 stroke-2 transition-colors duration-500 ${getStatusClass('Sensors')}`} />
                        <text x="50" y="45" textAnchor="middle" className="fill-slate-400 text-[10px] font-bold uppercase">Sensors</text>
                        <text x="50" y="70" textAnchor="middle" className="fill-white text-[12px] font-mono tracking-tighter">
                            {latest['FlowRate(L/min)'] || 0} LPM
                        </text>
                    </g>

                    {/* Control Logic */}
                    <g transform="translate(250, 150)">
                        <rect width="200" height="100" rx="12" className="fill-slate-900 stroke-slate-700 stroke-2" />
                        <text x="100" y="45" textAnchor="middle" className="fill-slate-400 text-[10px] font-bold uppercase">Control Logic (PID)</text>
                        <text x="100" y="70" textAnchor="middle" className="fill-white text-[12px] font-mono tracking-tighter">
                            DRIVE: {latest['MotorRPM'] || 0} RPM
                        </text>
                    </g>

                    {/* Actuators */}
                    <g transform="translate(550, 150)">
                        <rect width="100" height="100" rx="12" className={`fill-slate-900 stroke-2 transition-colors duration-500 ${getStatusClass('Actuators')}`} />
                        <text x="50" y="45" textAnchor="middle" className="fill-slate-400 text-[10px] font-bold uppercase">Blower</text>
                        <text x="50" y="70" textAnchor="middle" className="fill-white text-[12px] font-mono tracking-tighter">
                            {latest['Pressure(cmH2O)'] || 0} cmH2O
                        </text>
                    </g>

                    {/* Safety Monitor Overlay */}
                    <g transform="translate(250, 50)">
                        <rect width="200" height="60" rx="12" className={`fill-slate-900 stroke-2 transition-all duration-300 ${latest.PressureLimitExceeded ? 'stroke-rose-500 bg-rose-500/10' : 'stroke-slate-800'}`} />
                        <text x="100" y="35" textAnchor="middle" className={`text-[10px] font-bold uppercase ${latest.PressureLimitExceeded ? 'fill-rose-400' : 'fill-slate-500'}`}>
                            Safety Monitor
                        </text>
                    </g>
                </svg>

                {/* Legend / Info Overlay */}
                <div className="absolute bottom-4 left-4 flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Normal Operation</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Fault Condition</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
