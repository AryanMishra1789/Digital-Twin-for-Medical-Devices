import React from 'react';
import { Package, Power, RefreshCw, AlertCircle } from 'lucide-react';

const COMPONENTS = [
    { id: 'flow_sensor', name: 'Flow Sensor', icon: RefreshCw },
    { id: 'pressure_sensor', name: 'Pressure Sensor', icon: RefreshCw },
    { id: 'blower_motor', name: 'Blower Motor', icon: Power },
    { id: 'safety_monitor', name: 'Safety Monitor', icon: AlertCircle },
];

const MODES = ['Ideal', 'Noisy', 'Failed'];

export default function ComponentPanel({ modes, onModeChange }) {
    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                <Package size={14} className="text-sky-400" /> Component Inventory
            </h3>

            <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                {COMPONENTS.map((comp) => {
                    const Icon = comp.icon;
                    const currentMode = modes[comp.name] || 'Ideal';

                    return (
                        <div key={comp.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${currentMode === 'Ideal' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-200">{comp.name}</span>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentMode === 'Ideal' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {currentMode}
                                </div>
                            </div>

                            <div className="flex gap-1 mt-3">
                                {MODES.map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => onModeChange(comp.name, mode)}
                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold border transition-all ${currentMode === mode
                                                ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20'
                                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
