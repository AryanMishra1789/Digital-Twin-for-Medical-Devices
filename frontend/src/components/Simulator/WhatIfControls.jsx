import React from 'react';
import { Sliders, AlertTriangle, Play, Square, Save, RotateCcw } from 'lucide-react';

export default function WhatIfControls({
    params,
    onParamChange,
    onRun,
    onStop,
    isRunning,
    onReset
}) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Sliders size={14} className="text-sky-400" /> Control Dashboard & What-If Analysis
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={onReset}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors title='Reset Simulation'"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Scenario Parameters */}
                <div className="space-y-4">
                    <div>
                        <label className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                            <span>Target Flow Rate</span>
                            <span className="text-sky-400">{params.target_flow_rate} LPM</span>
                        </label>
                        <input
                            type="range" min="10" max="100" step="1"
                            value={params.target_flow_rate}
                            onChange={(e) => onParamChange('target_flow_rate', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                            <span>Safety Pressure Limit</span>
                            <span className="text-rose-400">{params.max_pressure} cmH2O</span>
                        </label>
                        <input
                            type="range" min="20" max="60" step="1"
                            value={params.max_pressure}
                            onChange={(e) => onParamChange('max_pressure', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                    </div>
                </div>

                {/* Fault Triggers */}
                <div className="space-y-3 bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-tighter mb-1 flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-500" /> Active Fault Injection
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 transition-all">
                            Sensor Stuck High
                        </button>
                        <button className="py-2 rounded-lg bg-rose-500/5 border border-rose-500/20 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all">
                            Total Power Fail
                        </button>
                        <button className="py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-[10px] font-bold text-slate-400 hover:bg-slate-800 transition-all">
                            Intermittent Sig
                        </button>
                        <button className="py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-[10px] font-bold text-slate-400 hover:bg-slate-800 transition-all">
                            Valve Jammed
                        </button>
                    </div>
                </div>

                {/* Executive Controls */}
                <div className="flex flex-col gap-3 justify-center">
                    {!isRunning ? (
                        <button
                            onClick={onRun}
                            className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xl shadow-sky-500/20 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                        >
                            <Play fill="white" size={18} /> Initiate Simulation
                        </button>
                    ) : (
                        <button
                            onClick={onStop}
                            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-xl shadow-rose-500/20 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                        >
                            <Square fill="white" size={18} /> Abort Execution
                        </button>
                    )}
                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                            <Save size={14} /> Save Snapshot
                        </button>
                        <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                            <Layout size={14} /> Report PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
