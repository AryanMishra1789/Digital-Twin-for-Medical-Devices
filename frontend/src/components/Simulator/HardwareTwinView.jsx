import React from 'react';
import { Cpu, Zap, Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import HW_CONFIGS from './hardwareConfigs';

// ═══════════════════════════════════════════════════════════════
// TYPE STYLING — Block fill/stroke by electronics type
// ═══════════════════════════════════════════════════════════════
const TYPE_COLORS = {
    power: { fill: '#0c1a0c', stroke: '#22c55e', icon: '⚡' },
    control: { fill: '#0a1628', stroke: '#38bdf8', icon: '◈' },
    driver: { fill: '#1a150a', stroke: '#f59e0b', icon: '⟐' },
    sensor: { fill: '#0a1a1a', stroke: '#2dd4bf', icon: '◉' },
    safety: { fill: '#1a0a0e', stroke: '#f43f5e', icon: '⛨' },
    output: { fill: '#0f0a1a', stroke: '#a78bfa', icon: '▷' },
};

// Bus line dash patterns
const BUS_DASH = { power: '8 4', data: '0', signal: '4 4', timing: '12 4 2 4' };

export default function HardwareTwinView({ deviceType, selectedComponent, onSelectComponent, activeFaults, safetyLog, onAddSafetyEvent }) {
    const config = HW_CONFIGS[deviceType] || HW_CONFIGS.pulse_ox;

    // Debug logging
    console.log('[HardwareTwinView] deviceType:', deviceType);
    console.log('[HardwareTwinView] config:', config);
    console.log('[HardwareTwinView] has powerDomains:', Array.isArray(config?.powerDomains));
    console.log('[HardwareTwinView] has buses:', Array.isArray(config?.buses));
    console.log('[HardwareTwinView] has blocks:', Array.isArray(config?.blocks));

    // Defensive: if configuration is missing or malformed, show a user-facing message
    if (!config || !Array.isArray(config.blocks)) {
        console.error('[HardwareTwinView] Invalid config - showing error message');
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Layer-2 unavailable</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>No hardware configuration found for this device.</div>
                </div>
            </div>
        );
    }
    const faultedBlocks = new Set();
    const faultedDomains = new Set();

    (activeFaults || []).forEach(f => {
        (f.affectedBlocks || []).forEach(b => faultedBlocks.add(b));
        if (f.affectedDomain) faultedDomains.add(f.affectedDomain);
    });

    const isBlockFaulted = (id) => faultedBlocks.has(id);
    const isDomainFaulted = (id) => faultedDomains.has(id);
    const isSelected = (block) => block.systemLink && selectedComponent === block.systemLink;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Cpu size={16} style={{ color: '#38bdf8' }} /> {config.label}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span title="Derived from the same system design graph as Layer-1." style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#1e293b', color: '#94a3b8', cursor: 'help', display: 'flex', alignItems: 'center', gap: 5 }}>
                        ⛓ {config.provenance} <ExternalLink size={10} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: activeFaults?.length ? '#7f1d1d20' : '#02262220', color: activeFaults?.length ? '#f43f5e' : '#2dd4bf', border: `1px solid ${activeFaults?.length ? '#f43f5e30' : '#2dd4bf20'}` }}>
                        {activeFaults?.length ? `⚠ ${activeFaults.length} FAULT${activeFaults.length > 1 ? 'S' : ''}` : '✓ ALL NOMINAL'}
                    </span>
                </div>
            </div>

            {/* SVG Schematic */}
            <div style={{ flex: 1, position: 'relative', borderRadius: 10, border: '1px solid #1e293b40', overflow: 'hidden', background: '#020617', minHeight: 0 }}>
                <svg width="100%" height="100%" viewBox="0 0 740 400" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <marker id="hw-arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                            <path d="M0 0 L10 5 L0 10z" fill="#334155" />
                        </marker>
                        <marker id="hw-arr-r" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                            <path d="M0 0 L10 5 L0 10z" fill="#f43f5e" />
                        </marker>
                        {/* Animated dash for active signals */}
                        <style>{`
              @keyframes hwDash { to { stroke-dashoffset: -20; } }
              .hw-animated { animation: hwDash 1s linear infinite; }
            `}</style>
                    </defs>

                    {/* Dot grid background */}
                    {Array.from({ length: 19 }).map((_, i) =>
                        Array.from({ length: 11 }).map((_, j) =>
                            <circle key={`g-${i}-${j}`} cx={i * 40 + 10} cy={j * 40} r="0.7" fill="#ffffff04" />
                        )
                    )}

                    {/* ── POWER DOMAINS ── */}
                    {(config.powerDomains || []).map(pd => {
                        const faulted = isDomainFaulted(pd.id);
                        return (
                            <g key={pd.id}>
                                <rect x={pd.x} y={pd.y} width={pd.w} height={pd.h} rx="12"
                                    fill={faulted ? '#1a0a0e08' : pd.color}
                                    stroke={faulted ? '#f43f5e40' : pd.borderColor}
                                    strokeWidth="1" strokeDasharray="6 3" />
                                <text x={pd.x + 10} y={pd.y + 14} fill={faulted ? '#f43f5e60' : '#ffffff30'} fontSize="10" fontWeight="700" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {faulted ? '✕ ' : ''}{pd.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* ── BUSES / SIGNAL PATHS ── */}
                    {(config.buses || []).map((bus, i) => {
                        const isFaultPath = bus.type === 'signal' && bus.color === '#f43f5e';
                        const points = [bus.from];
                        if (bus.to) points.push(bus.to);
                        if (bus.to2) points.push(bus.to2);
                        if (bus.to3) points.push(bus.to3);

                        const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

                        return (
                            <g key={`bus-${i}`}>
                                <path d={pathD} fill="none"
                                    stroke={bus.color || '#334155'}
                                    strokeWidth={bus.type === 'power' ? 2.5 : 1.5}
                                    strokeDasharray={BUS_DASH[bus.type] || '0'}
                                    markerEnd={isFaultPath ? 'url(#hw-arr-r)' : 'url(#hw-arr)'}
                                    className={bus.type === 'timing' ? 'hw-animated' : ''}
                                    style={bus.type === 'timing' ? { strokeDashoffset: 0 } : {}}
                                />
                                {bus.label && (
                                    <text x={points[0][0] + (points[1][0] - points[0][0]) * 0.5}
                                        y={points[0][1] + (points[1][1] - points[0][1]) * 0.5 - 6}
                                        textAnchor="middle" fill={bus.color || '#475569'} fontSize="9" fontWeight="700"
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {bus.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* ── ELECTRONICS BLOCKS ── */}
                    {config.blocks.map(block => {
                        const tc = TYPE_COLORS[block.type] || TYPE_COLORS.control;
                        const faulted = isBlockFaulted(block.id);
                        const selected = isSelected(block);

                        const strokeColor = faulted ? '#f43f5e' : selected ? '#38bdf8' : tc.stroke + '60';
                        const fillColor = faulted ? '#1a0a0e' : tc.fill;
                        const strokeW = faulted || selected ? 2 : 1;

                        return (
                            <g key={block.id} transform={`translate(${block.x},${block.y})`}
                                onClick={() => block.systemLink && onSelectComponent?.(block.systemLink)}
                                style={{ cursor: block.systemLink ? 'pointer' : 'default' }}
                            >
                                <rect width={block.w} height={block.h} rx="8"
                                    fill={fillColor} stroke={strokeColor} strokeWidth={strokeW} />
                                {/* Pulse on fault */}
                                {faulted && (
                                    <rect width={block.w} height={block.h} rx="8" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.3">
                                        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.2s" repeatCount="indefinite" />
                                    </rect>
                                )}
                                {/* Selection glow */}
                                {selected && (
                                    <rect width={block.w} height={block.h} rx="8" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.4">
                                        <animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.5s" repeatCount="indefinite" />
                                    </rect>
                                )}
                                {/* Type icon */}
                                <text x={8} y={16} fill={faulted ? '#f43f5e' : tc.stroke} fontSize="12" fontWeight="700">{tc.icon}</text>
                                {/* Fault overlay */}
                                {faulted && <text x={block.w - 14} y={16} fill="#f43f5e" fontSize="14" fontWeight="900">✕</text>}
                                {/* Label */}
                                <text x={block.w / 2} y={block.h * 0.42} textAnchor="middle"
                                    fill={faulted ? '#f43f5e' : '#cbd5e1'} fontSize="11" fontWeight="700"
                                    style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    {block.label}
                                </text>
                                {/* Sublabel */}
                                <text x={block.w / 2} y={block.h * 0.42 + 16} textAnchor="middle"
                                    fill={faulted ? '#f43f5e80' : '#64748b'} fontSize="9" fontWeight="600">
                                    {block.sublabel}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Legend bar */}
                <div style={{ position: 'absolute', bottom: 8, left: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {[
                        { c: '#22c55e', l: 'Power' }, { c: '#38bdf8', l: 'Control' },
                        { c: '#f59e0b', l: 'Driver' }, { c: '#2dd4bf', l: 'Sensor' },
                        { c: '#f43f5e', l: 'Safety' }, { c: '#a78bfa', l: 'Output' },
                    ].map(x => (
                        <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 7, height: 7, borderRadius: 2, background: x.c }} />
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{x.l}</span>
                        </div>
                    ))}
                </div>

                {/* Bus type legend */}
                <div style={{ position: 'absolute', bottom: 8, right: 14, display: 'flex', gap: 14 }}>
                    {[
                        { dash: '0', l: 'Data Bus' }, { dash: '8 4', l: 'Power Rail' },
                        { dash: '4 4', l: 'Signal' }, { dash: '12 4 2 4', l: 'Timing' },
                    ].map(x => (
                        <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#64748b" strokeWidth="1.5" strokeDasharray={x.dash} /></svg>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{x.l}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
