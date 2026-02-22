import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runSimulation, runFaultySimulation } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Activity, Play, Pause, Square, SkipForward, RotateCcw, Package, Cpu, Sliders, AlertTriangle, Shield, Clock, ChevronDown, ChevronUp, ExternalLink, Camera, CircuitBoard } from 'lucide-react';
import DEVICE_CONFIGS from './Simulator/deviceConfigs';
import HardwareTwinView from './Simulator/HardwareTwinView';
import HW_CONFIGS from './Simulator/hardwareConfigs';

const MODES = ['Ideal', 'Noisy', 'Failed'];
const SPEEDS = [{ label: '1×', ms: 800 }, { label: '2×', ms: 400 }, { label: '10×', ms: 80 }];

export default function SimulationView({ deviceType }) {
	const config = DEVICE_CONFIGS[deviceType] || DEVICE_CONFIGS.ventilator;

	const [snapshots, setSnapshots] = useState([]);
	const [isRunning, setIsRunning] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const [fidelity, setFidelity] = useState('L2');
	const [speed, setSpeed] = useState(SPEEDS[0]);
	const [simTime, setSimTime] = useState(0);
	const [componentModes, setComponentModes] = useState(config.defaultModes);
	const [params, setParams] = useState(config.params);
	const [activeFault, setActiveFault] = useState(null);
	const [safetyLog, setSafetyLog] = useState([]);
	const [chartPaused, setChartPaused] = useState(false);
	const [controlMode, setControlMode] = useState(config.controlModes?.[0] || null);
	const [logExpanded, setLogExpanded] = useState(true);
	const [activeLayer, setActiveLayer] = useState('system');
	const [selectedComponent, setSelectedComponent] = useState(null);
	const [hwFaults, setHwFaults] = useState([]);
	const timerRef = useRef(null);
	const stepRef = useRef(0);
	const hwConfig = HW_CONFIGS[deviceType] || HW_CONFIGS.pulse_ox;

	useEffect(() => {
		handleFullStop();
		setSnapshots([]); setComponentModes(config.defaultModes);
		setParams(config.params); setActiveFault(null);
		setSafetyLog([]); setSimTime(0); stepRef.current = 0;
		setControlMode(config.controlModes?.[0] || null);
		setHwFaults([]); setSelectedComponent(null);
	}, [deviceType]);

	const addSafetyEvent = useCallback((msg, severity, reference) => {
		setSafetyLog(prev => [...prev, { t: stepRef.current, msg, severity, reference, ts: Date.now() }].slice(-30));
	}, []);

	const handleHwFault = useCallback((fault) => {
		setHwFaults(prev => {
			const exists = prev.find(f => f.id === fault.id);
			const next = exists ? prev.filter(f => f.id !== fault.id) : [...prev, fault];
			return next;
		});
		addSafetyEvent(`[HW] ${fault.label} → ${fault.response}`, fault.severity, fault.reference);

		// Propagate HW fault to system-level component modes so Layer-1 updates visually
		try {
			const affected = fault.affectedBlocks || [];
			const mapToSystem = affected.map(bid => {
				const blk = hwConfig.blocks.find(b => b.id === bid);
				return blk?.systemLink;
			}).filter(Boolean);
			if (mapToSystem.length) {
				setComponentModes(prev => {
					const next = { ...prev };
					mapToSystem.forEach(sysId => {
						const comp = config.components.find(c => c.id === sysId);
						if (comp) next[comp.name] = fault.severity === 'critical' ? 'Failed' : 'Noisy';
					});
					return next;
				});
				mapToSystem.forEach(sysId => addSafetyEvent(`[HW→SYS] ${fault.label} affected ${sysId}`, fault.severity, fault.reference));
			}
		} catch (e) { console.warn('Propagation error', e); }
	}, [addSafetyEvent, hwConfig, config]);

	useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

	useEffect(() => {
		if (isRunning && !isPaused) {
			if (timerRef.current) clearInterval(timerRef.current);
			timerRef.current = setInterval(() => doTick(), speed.ms);
		}
	}, [speed, isRunning, isPaused]);

	const doTick = useCallback(async () => {
		try {
			const res = await runSimulation(deviceType, 1, fidelity);
			const newSnaps = res.data.snapshots.map(s => ({ ...s, t: stepRef.current++ }));
			setSimTime(stepRef.current * 0.1);
			if (!chartPaused) setSnapshots(prev => [...prev, ...newSnaps].slice(-80));
			const vals = newSnaps[0]?.values || {};
			if (vals.PressureLimitExceeded) addSafetyEvent(`Pressure exceeded ${params.max_pressure || '?'} cmH2O → Safety override`, 'critical', config.standard.safety);
			if (vals.FlowRateLimitExceeded) addSafetyEvent(`Flow rate limit exceeded → Clinician alert`, 'warning', config.standard.safety);
		} catch (err) { console.error("Tick error:", err); }
	}, [deviceType, fidelity, chartPaused, params, config, addSafetyEvent]);

	const handleRun = () => { setIsRunning(true); setIsPaused(false); timerRef.current = setInterval(() => doTick(), speed.ms); };
	const handlePause = () => { setIsPaused(true); if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
	const handleResume = () => { setIsPaused(false); timerRef.current = setInterval(() => doTick(), speed.ms); };
	const handleFullStop = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; setIsRunning(false); setIsPaused(false); }, []);
	const handleStep = async () => { if (!isRunning) { setIsRunning(true); setIsPaused(true); } await doTick(); };
	const handleReset = () => { handleFullStop(); setSnapshots([]); setActiveFault(null); setSafetyLog([]); setSimTime(0); stepRef.current = 0; };

	const handleFault = useCallback(async (fault) => {
		try {
			const res = await runFaultySimulation(deviceType, fault.param, fault.bias, 10);
			if (res.data.error) { alert(res.data.error); return; }
			const base = stepRef.current;
			const newSnaps = res.data.snapshots.map((s, i) => ({ ...s, t: base + i }));
			stepRef.current = base + newSnaps.length;
			setSimTime(stepRef.current * 0.1);
			setSnapshots(prev => [...prev, ...newSnaps].slice(-80));
			setActiveFault(fault);
			addSafetyEvent(`${fault.label} → ${fault.response}`, fault.severity, fault.reference);
		} catch (err) { console.error("Fault error:", err); }
	}, [deviceType, addSafetyEvent]);

	const handleModeChange = (comp, mode) => {
		setComponentModes(prev => ({ ...prev, [comp]: mode }));
		if (mode === 'Failed') addSafetyEvent(`${comp} set to FAILED mode`, 'critical', config.standard.primary + ' §8.1');
		else if (mode === 'Noisy') addSafetyEvent(`${comp} degraded — NOISY mode`, 'warning', config.standard.primary);
	};

	const handleParamChange = (key, value) => { setParams(prev => ({ ...prev, [key]: value })); };

	const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1]?.values || {} : {};
	const hasFault = latest.PressureLimitExceeded || latest.FlowRateLimitExceeded || activeFault;
	const chartData = snapshots.map(snap => ({ time: snap.t, ...snap.values }));

	const getBlockStatus = (blockId) => {
		const linked = config.components.filter(c => c.archBlockId === blockId);
		if (linked.some(c => componentModes[c.name] === 'Failed')) return 'failed';
		if (linked.some(c => componentModes[c.name] === 'Noisy')) return 'noisy';
		return 'ideal';
	};

	// Pill button style
	const pill = (active, color) => ({
		fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8,
		background: active ? `${color}20` : 'transparent', color: active ? color : '#64748b',
		border: `1px solid ${active ? color + '40' : '#1e293b'}`, cursor: 'pointer', transition: 'all 0.15s',
	});

	const ctrlBtn = (bg, clr) => ({
		padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
		background: bg, color: clr, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
		textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.15s',
	});

	return (
		<div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', gap: 8 }}>

			{/* ════════ SIMULATION CONTROL BAR ════════ */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b', flexShrink: 0 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					{!isRunning ? (
						<button onClick={handleRun} style={{ ...ctrlBtn('#0284c7', '#fff'), boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}><Play size={14} fill="#fff" /> Run</button>
					) : isPaused ? (
						<button onClick={handleResume} style={ctrlBtn('#0284c7', '#fff')}><Play size={14} fill="#fff" /> Resume</button>
					) : (
						<button onClick={handlePause} style={ctrlBtn('#334155', '#e2e8f0')}><Pause size={14} /> Pause</button>
					)}
					<button onClick={handleStep} style={ctrlBtn('#1e293b', '#94a3b8')} title="Step one Δt"><SkipForward size={14} /> Step</button>
					{isRunning && <button onClick={handleFullStop} style={ctrlBtn('#7f1d1d', '#fca5a5')}><Square size={12} fill="#fca5a5" /> Stop</button>}
					<button onClick={handleReset} style={ctrlBtn('#1e293b', '#64748b')}><RotateCcw size={13} /> Reset</button>
					<div style={{ width: 1, height: 24, background: '#334155', margin: '0 6px' }} />
					{SPEEDS.map(sp => (
						<button key={sp.label} onClick={() => setSpeed(sp)} style={pill(speed.label === sp.label, '#38bdf8')}>{sp.label}</button>
					))}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<Clock size={16} style={{ color: '#64748b' }} />
					<span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>T = {simTime.toFixed(1)}s</span>
					<div style={{ width: 1, height: 20, background: '#334155', margin: '0 8px' }} />
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<div style={{ width: 8, height: 8, borderRadius: '50%', background: isRunning && !isPaused ? '#10b981' : isPaused ? '#f59e0b' : '#475569' }} />
						<span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
							{isRunning ? (isPaused ? 'Paused' : 'Running') : 'Idle'}
						</span>
					</div>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					{['L1', 'L2', 'L3'].map(l => (
						<button key={l} onClick={() => setFidelity(l)} style={pill(fidelity === l, '#38bdf8')}>{l}</button>
					))}
					<div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />
					<span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8, background: hasFault ? '#7f1d1d20' : '#02262220', color: hasFault ? '#f43f5e' : '#2dd4bf', border: `1px solid ${hasFault ? '#f43f5e30' : '#2dd4bf20'}` }}>
						{hasFault ? '⚠ FAULT' : '✓ NOMINAL'}
					</span>
				</div>
			</div>

			{/* ════════ LAYER TABS ════════ */}
			<div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
				{[{ id: 'system', label: 'System Twin', icon: <Cpu size={14} /> }, { id: 'hardware', label: 'Hardware / Electronics Twin', icon: <CircuitBoard size={14} /> }].map(tab => (
					<button key={tab.id} onClick={() => setActiveLayer(tab.id)} style={{
						padding: '8px 20px', borderRadius: tab.id === 'system' ? '8px 0 0 8px' : '0 8px 8px 0',
						fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
						textTransform: 'uppercase', letterSpacing: '0.04em',
						background: activeLayer === tab.id ? '#0f172a' : '#020617',
						color: activeLayer === tab.id ? '#e2e8f0' : '#475569',
						border: activeLayer === tab.id ? '1px solid #1e293b' : '1px solid #0f172a',
						borderBottom: activeLayer === tab.id ? '2px solid #0ea5e9' : '2px solid transparent',
					}}>{tab.icon} {tab.label}</button>
				))}
			</div>

			{/* ════════ MAIN 3-COLUMN LAYOUT ════════ */}
			<div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 10, overflow: 'hidden', minHeight: 0 }}>

				{/* ═══ LEFT PANEL: Components ═══ */}
				<div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
					<h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
						<Package size={16} style={{ color: '#38bdf8' }} /> Components
					</h3>
					{config.controlModes && (
						<div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
							{config.controlModes.map(cm => (
								<button key={cm} onClick={() => setControlMode(cm)} style={{
									flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
									textTransform: 'uppercase', letterSpacing: '0.04em',
									background: controlMode === cm ? '#0284c7' : '#0f172a',
									color: controlMode === cm ? '#fff' : '#64748b',
									border: controlMode === cm ? '1px solid #0ea5e9' : '1px solid #1e293b',
								}}>{cm}</button>
							))}
						</div>
					)}
					<div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
						{config.components.map(comp => {
							const Icon = comp.icon;
							const mode = componentModes[comp.name] || 'Ideal';
							const isNom = mode === 'Ideal' || mode === 'Active';
							const isFail = mode === 'Failed';
							return (
								<div key={comp.id} style={{ padding: 14, borderRadius: 12, background: '#0f172a', border: `1px solid ${isFail ? '#f43f5e30' : isNom ? '#1e293b' : '#f59e0b30'}`, transition: 'all 0.2s' }}>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
											<div style={{ padding: 8, borderRadius: 8, background: isFail ? '#f43f5e15' : isNom ? '#38bdf815' : '#f59e0b15', color: isFail ? '#f43f5e' : isNom ? '#38bdf8' : '#f59e0b' }}>
												<Icon size={16} />
											</div>
											<span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{comp.name}</span>
										</div>
										<span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: isFail ? '#f43f5e15' : isNom ? '#38bdf815' : '#f59e0b15', color: isFail ? '#f43f5e' : isNom ? '#38bdf8' : '#f59e0b' }}>{mode}</span>
									</div>
									<div style={{ display: 'flex', gap: 4 }}>
										{MODES.map(m => (
											<button key={m} onClick={() => handleModeChange(comp.name, m)} style={{
												flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
												background: mode === m ? (m === 'Failed' ? '#991b1b' : m === 'Noisy' ? '#92400e' : '#0284c7') : '#020617',
												color: mode === m ? '#fff' : '#64748b',
												border: `1px solid ${mode === m ? (m === 'Failed' ? '#f43f5e' : m === 'Noisy' ? '#f59e0b' : '#0ea5e9') : '#1e293b'}`,
											}}>{m}</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* ═══ CENTER ═══ */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', minHeight: 0 }}>

					{activeLayer === 'hardware' ? (
						/* ── LAYER-2: HARDWARE TWIN ── */
						<div className="glass-card" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
							<HardwareTwinView
								deviceType={deviceType}
								selectedComponent={selectedComponent}
								onSelectComponent={setSelectedComponent}
								activeFaults={hwFaults}
								safetyLog={safetyLog}
								onAddSafetyEvent={addSafetyEvent}
							/>
						</div>
					) : (
						/* ── LAYER-1: SYSTEM TWIN ── */
						<>
							{/* Architecture View */}
							<div className="glass-card" style={{ flex: '1 1 55%', padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
									<h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
										<Cpu size={16} style={{ color: '#38bdf8' }} /> System Architecture
									</h3>
									<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<span title="Architecture auto-generated from the system design graph. Topology is fixed; component behavior models are swappable." style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#1e293b', color: '#94a3b8', cursor: 'help', display: 'flex', alignItems: 'center', gap: 5 }}>
											⛓ Derived from Design Graph v1.0 <ExternalLink size={10} />
										</span>
										<span style={pill(true, isRunning ? '#10b981' : '#475569')}>{isRunning ? '⚡ LIVE' : '○ IDLE'}</span>
									</div>
								</div>
								<div style={{ flex: 1, position: 'relative', borderRadius: 10, border: '1px solid #1e293b40', overflow: 'hidden', background: '#020617', minHeight: 0 }}>
									<svg width="100%" height="100%" viewBox="0 0 720 370" preserveAspectRatio="xMidYMid meet">
										<defs>
											<marker id="arrG" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#334155" /></marker>
											<marker id="arrR" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#f43f5e" /></marker>
										</defs>
										{Array.from({ length: 18 }).map((_, i) => Array.from({ length: 10 }).map((_, j) => <circle key={`${i}-${j}`} cx={i * 40 + 20} cy={j * 40 + 5} r="0.8" fill="#ffffff05" />))}
										{config.archConnections.map((c, i) => (
											<g key={`c-${i}`}>
												<line x1={c.from[0]} y1={c.from[1]} x2={c.to[0]} y2={c.to[1]} stroke={c.color || '#334155'} strokeWidth="2" markerEnd="url(#arrG)" />
												{c.label && <text x={(c.from[0] + c.to[0]) / 2} y={(c.from[1] + c.to[1]) / 2 - 8} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="700" style={{ textTransform: 'uppercase' }}>{c.label}</text>}
											</g>
										))}
										{config.feedbackLoop && (
											<g>
												<path d={`M${config.feedbackLoop.from[0]},${config.feedbackLoop.from[1]} L${config.feedbackLoop.mid1[0]},${config.feedbackLoop.mid1[1]} L${config.feedbackLoop.mid2[0]},${config.feedbackLoop.mid2[1]} L${config.feedbackLoop.to[0]},${config.feedbackLoop.to[1]}`}
													fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 3" markerEnd="url(#arrG)" />
												<text x={360} y={338} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="700">↻ {config.feedbackLoop.label}</text>
											</g>
										)}
										{config.emergencyPaths?.map((ep, i) => (
											<g key={`em-${i}`}>
												<line x1={ep.from[0]} y1={ep.from[1]} x2={ep.to[0]} y2={ep.to[1]} stroke={ep.color} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#arrR)" />
												<text x={(ep.from[0] + ep.to[0]) / 2 + 12} y={(ep.from[1] + ep.to[1]) / 2} fill={ep.color} fontSize="10" fontWeight="800">{ep.label}</text>
											</g>
										))}
										{deviceType === 'dialysis' && <>
											<text x={350} y={68} textAnchor="middle" fill="#f43f5e40" fontSize="10" fontWeight="800" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>— Blood Circuit —</text>
											<text x={350} y={335} textAnchor="middle" fill="#38bdf840" fontSize="10" fontWeight="800" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>— Dialysate Circuit —</text>
										</>}
										{config.archBlocks.map(block => {
											const val = block.sublabel ? latest[block.sublabel] : null;
											const status = block.isSafety ? (hasFault ? 'failed' : 'ideal') : getBlockStatus(block.id);
											const isSelectedArch = config.components.some(c => c.archBlockId === block.id && selectedComponent === c.id);
											const strokeClrBase = status === 'failed' ? '#f43f5e' : status === 'noisy' ? '#f59e0b' : (block.circuit === 'blood' ? '#f43f5e30' : block.circuit === 'dialysate' ? '#38bdf830' : '#1e293b');
											const strokeClr = isSelectedArch ? '#38bdf8' : strokeClrBase;
											const fillClr = status === 'failed' ? '#1a0a0e' : status === 'noisy' ? '#1a150a' : '#0f172a';

											return (
												<g key={block.id} transform={`translate(${block.x},${block.y})`} onClick={() => {
													const comps = config.components.filter(c => c.archBlockId === block.id);
													if (comps.length) {
														setSelectedComponent(comps[0].id);
														setActiveLayer('hardware');
													} else {
														setSelectedComponent(null);
													}
												}} style={{ cursor: 'pointer' }}>
													<rect width={block.w} height={block.h} rx="10" fill={fillClr} stroke={strokeClr} strokeWidth={(status !== 'ideal' || isSelectedArch) ? 2 : 1} />
													{status === 'failed' && <rect width={block.w} height={block.h} rx="10" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.3"><animate attributeName="opacity" values="0.1;0.6;0.1" dur="1.2s" repeatCount="indefinite" /></rect>}
													{status === 'noisy' && <text x={block.w - 10} y={16} fill="#f59e0b" fontSize="14" fontWeight="900">~</text>}
													{status === 'failed' && <text x={block.w - 10} y={16} fill="#f43f5e" fontSize="13" fontWeight="900">✕</text>}
													<text x={block.w / 2} y={block.isSafety ? 22 : 28} textAnchor="middle" fill={status === 'failed' ? '#f43f5e' : status === 'noisy' ? '#f59e0b' : '#94a3b8'} fontSize="12" fontWeight="700" style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>{block.label}</text>
													{val !== null && val !== undefined && (
														<text x={block.w / 2} y={block.isSafety ? 42 : 58} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontFamily="monospace" fontWeight="700">
															{typeof val === 'number' ? val.toFixed(1) : val} <tspan fill="#64748b" fontSize="11">{block.unit || ''}</tspan>
														</text>
													)}
												</g>
											);
										})}
									</svg>
									<div style={{ position: 'absolute', bottom: 8, left: 14, display: 'flex', gap: 16 }}>
										{[{ c: '#38bdf8', l: 'Normal' }, { c: '#f59e0b', l: 'Noisy' }, { c: '#f43f5e', l: 'Fault' }].map(x => (
											<div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
												<div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />
												<span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{x.l}</span>
											</div>
										))}
									</div>
								</div>
							</div>

							{/* Telemetry Chart */}
							<div className="glass-card" style={{ flex: '1 1 45%', padding: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
									<h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
										<Activity size={16} style={{ color: '#38bdf8' }} /> Signal Telemetry
									</h3>
									<div style={{ display: 'flex', gap: 6 }}>
										<button onClick={() => setChartPaused(!chartPaused)} style={pill(chartPaused, '#f59e0b')}>{chartPaused ? '▶ Resume' : '⏸ Freeze'}</button>
										<button onClick={() => addSafetyEvent('Telemetry snapshot captured', 'info', '')} style={pill(false, '#38bdf8')}><Camera size={11} /> Snap</button>
									</div>
								</div>
								<div style={{ flex: 1, minHeight: 0 }}>
									{chartData.length > 0 ? (
										<ResponsiveContainer width="100%" height="100%">
											<LineChart data={chartData}>
												<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
												<XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'Time (steps)', position: 'insideBottomRight', offset: -2, fill: '#64748b', fontSize: 10 }} />
												<YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 'auto']} />
												<Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
												<Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }} />
												{config.metrics.filter(m => m.thresholdParam).map(m => (
													<ReferenceLine key={`ref-${m.key}`} y={params[m.thresholdParam]} stroke="#f43f5e" strokeDasharray="6 3" strokeWidth={1.5}
														label={{ value: `${m.thresholdDir === 'below' ? 'Min' : 'Max'}: ${params[m.thresholdParam]} ${config.sliders.find(s => s.key === m.thresholdParam)?.unit || ''}`, fill: '#f43f5e', fontSize: 10, fontWeight: 700, position: 'right' }} />
												))}
												{config.metrics.map(m => (
													<Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={false} name={m.label} isAnimationActive={false} />
												))}
											</LineChart>
										</ResponsiveContainer>
									) : (
										<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>
											<div style={{ textAlign: 'center' }}><RotateCcw size={36} style={{ margin: '0 auto 14px', opacity: 0.3 }} /><p style={{ fontWeight: 600 }}>Initiate simulation to begin telemetry</p></div>
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</div>

				{/* ═══ RIGHT PANEL: Controls + Safety Log ═══ */}
				<div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
					<h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
						<Sliders size={16} style={{ color: '#38bdf8' }} /> What-If Analysis
					</h3>
					<div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
						{/* Params */}
						<div style={{ padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
							<h4 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.06em' }}>Scenario Parameters</h4>
							{config.sliders.map(s => (
								<div key={s.key} style={{ marginBottom: 14 }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
										<span>{s.label}</span>
										<span style={{ color: s.color === 'sky' ? '#38bdf8' : '#f43f5e', fontWeight: 700 }}>{params[s.key]} {s.unit}</span>
									</div>
									<input type="range" min={s.min} max={s.max} step="1" value={params[s.key]}
										onChange={e => handleParamChange(s.key, parseFloat(e.target.value))}
										style={{ width: '100%', height: 6, accentColor: s.color === 'sky' ? '#0284c7' : '#e11d48' }} />
								</div>
							))}
						</div>
						{/* Faults — context-aware: system or hardware */}
						<div style={{ padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }}>
							<h4 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
								<AlertTriangle size={13} style={{ color: '#f59e0b' }} />
								{activeLayer === 'hardware' ? 'HW Fault Injection' : 'Fault Injection'}
							</h4>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
								{activeLayer === 'hardware' ? (
									hwConfig.faults.map((f, i) => {
										const isActive = hwFaults.some(hf => hf.id === f.id);
										return (
											<button key={i} onClick={() => handleHwFault(f)} style={{
												padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
												background: isActive ? (f.severity === 'critical' ? '#7f1d1d20' : '#92400e20') : '#020617',
												color: isActive ? (f.severity === 'critical' ? '#f43f5e' : '#f59e0b') : '#94a3b8',
												border: `1px solid ${isActive ? (f.severity === 'critical' ? '#f43f5e30' : '#f59e0b30') : '#1e293b'}`,
											}}>
												{f.severity === 'critical' ? '🔴' : '🟡'} {f.label}
											</button>
										);
									})
								) : (
									config.faults.map((f, i) => (
										<button key={i} onClick={() => handleFault(f)} style={{
											padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
											background: activeFault?.label === f.label ? (f.severity === 'critical' ? '#7f1d1d20' : '#92400e20') : '#020617',
											color: activeFault?.label === f.label ? (f.severity === 'critical' ? '#f43f5e' : '#f59e0b') : '#94a3b8',
											border: `1px solid ${activeFault?.label === f.label ? (f.severity === 'critical' ? '#f43f5e30' : '#f59e0b30') : '#1e293b'}`,
										}}>
											{f.severity === 'critical' ? '🔴' : '🟡'} {f.label}
										</button>
									))
								)}
							</div>
						</div>

						{/* Safety Log */}
						<div style={{ padding: 14, borderRadius: 12, background: '#0a0e1a', border: '1px solid #1e293b', flex: logExpanded ? 1 : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: logExpanded ? 100 : 'auto' }}>
							<div onClick={() => setLogExpanded(!logExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: logExpanded ? 8 : 0 }}>
								<h4 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
									<Shield size={13} style={{ color: '#f59e0b' }} /> Safety Event Log
									{safetyLog.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: '#7f1d1d30', color: '#f43f5e' }}>{safetyLog.length}</span>}
								</h4>
								{logExpanded ? <ChevronUp size={14} style={{ color: '#64748b' }} /> : <ChevronDown size={14} style={{ color: '#64748b' }} />}
							</div>
							{logExpanded && (
								<div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
									{safetyLog.length === 0 ? (
										<p style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: '14px 0' }}>No safety events recorded</p>
									) : (
										[...safetyLog].reverse().map((ev, i) => (
											<div key={i} style={{
												padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.5,
												background: ev.severity === 'critical' ? '#1a0a0e' : ev.severity === 'warning' ? '#1a150a' : '#0f172a',
												borderLeft: `3px solid ${ev.severity === 'critical' ? '#f43f5e' : ev.severity === 'warning' ? '#f59e0b' : '#38bdf8'}`,
											}}>
												<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
													<span style={{ fontWeight: 700, color: ev.severity === 'critical' ? '#f43f5e' : ev.severity === 'warning' ? '#f59e0b' : '#38bdf8', textTransform: 'uppercase', fontSize: 11 }}>
														{ev.severity === 'critical' ? '🔴 Critical' : ev.severity === 'warning' ? '🟡 Warning' : 'ℹ Info'}
													</span>
													<span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>T={ev.t}</span>
												</div>
												<p style={{ color: '#cbd5e1', margin: 0, fontWeight: 500, fontSize: 12 }}>{ev.msg}</p>
												{ev.reference && <p style={{ color: '#64748b', margin: '3px 0 0', fontStyle: 'italic', fontSize: 10 }}>Ref: {ev.reference}</p>}
											</div>
										))
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
