import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Layout, Maximize2 } from 'lucide-react';

export default function SignalVisualization({ snapshots }) {
    const chartData = snapshots?.map(snap => ({
        time: snap.t,
        ...snap.values
    })) || [];

    const metrics = [
        { key: 'FlowRate(L/min)', color: '#38bdf8', label: 'Flow (LPM)' },
        { key: 'Pressure(cmH2O)', color: '#2dd4bf', label: 'Pressure (cmH2O)' },
        { key: 'MotorRPM', color: '#f43f5e', label: 'RPM' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-sky-400" /> Real-Time Signal telemetry
                </h3>
                <div className="flex gap-2">
                    <button className="p-1 hover:bg-slate-800 rounded text-slate-500 transition-colors">
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-950/20 rounded-xl border border-slate-800/50 p-4 relative overflow-hidden">
                <div className="scanline"></div>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#475569"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#475569"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'auto']}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                            itemStyle={{ padding: '2px 0' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }} />
                        {metrics.map(m => (
                            <Line
                                key={m.key}
                                type="monotone"
                                dataKey={m.key}
                                stroke={m.color}
                                strokeWidth={2}
                                dot={false}
                                name={m.label}
                                isAnimationActive={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
