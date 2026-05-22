import React, { useState } from 'react';
import { 
    History as HistoryIcon, Clock, ShieldCheck, Zap, 
    MessageSquare, Wrench, AlertTriangle, ArrowLeftRight, Activity 
} from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';
import { AuditLogEntry } from '../types';

export const ReportingAnalytics = () => {
    const { history } = useAppContext();
    const [auditFilter, setAuditFilter] = useState<'All' | 'Approvals' | 'Rejections' | 'Auto-Actions' | 'Depot Operations'>('All');

    // Helper to normalize legacy unwrapped AI reports and newer structured AuditLogEntries
    const normalizeRecord = (record: any): AuditLogEntry => {
        if (record.type === 'Depot_Operation' || record.type === 'AI_Evaluation') {
            return record as AuditLogEntry;
        }
        // Legacy unwrapped AI evaluation report
        return {
            id: record.id || `AUD-AI-${record.Trainset_ID || 'LEGACY'}-${record.Readiness_Score || 0}`,
            type: 'AI_Evaluation',
            category: 'Auto-Actions',
            title: 'AI Induction Evaluation',
            detail: record.Strategic_Summary || 'Routine AI readiness evaluation completed.',
            timestamp: record.timestamp || new Date().toISOString(),
            operator: 'System',
            readinessScore: record.Readiness_Score,
            decision: record.Induction_Decision || 'STANDBY',
            trainsetId: record.Trainset_ID
        } as AuditLogEntry;
    };

    const normalizedHistory = history.map(normalizeRecord);

    const filteredHistory = normalizedHistory.filter(record => {
        if (auditFilter === 'All') return true;
        return record.category === auditFilter;
    });

    const getIconAndColor = (record: AuditLogEntry) => {
        if (record.type === 'AI_Evaluation') {
            return {
                icon: <HistoryIcon className="w-5 h-5" />,
                colorClass: "bg-blue-50 text-metro-blue border-blue-150"
            };
        }

        const titleLower = record.title.toLowerCase();
        if (titleLower.includes('comment') || record.detail.toLowerCase().includes('comment')) {
            return {
                icon: <MessageSquare className="w-5 h-5" />,
                colorClass: "bg-indigo-50 text-indigo-600 border-indigo-150"
            };
        }
        if (titleLower.includes('servicing') || titleLower.includes('complete') || titleLower.includes('release')) {
            return {
                icon: <Wrench className="w-5 h-5" />,
                colorClass: "bg-emerald-50 text-emerald-600 border-emerald-150"
            };
        }
        if (titleLower.includes('swap')) {
            return {
                icon: <ArrowLeftRight className="w-5 h-5" />,
                colorClass: "bg-purple-50 text-purple-600 border-purple-150"
            };
        }
        // Offline/online toggles, cancellations, recalls
        return {
            icon: <AlertTriangle className="w-5 h-5" />,
            colorClass: "bg-amber-50 text-metro-orange border-amber-150"
        };
    };

    return (
        <section className="lg:col-span-12 space-y-6">
            {/* Bureau Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <HistoryIcon className="w-6 h-6 text-metro-blue" /> System Audit Trail
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Immutable ledger of AI evaluations, supervisor comments, planner overrides, and yard bay operations.</p>
                </div>
                
                {/* Horizontal Category Navigation Tabs */}
                <div className="flex flex-wrap bg-slate-100 rounded-xl p-1 border border-slate-200/50 shadow-inner max-w-full overflow-x-auto shrink-0">
                    {(['All', 'Approvals', 'Rejections', 'Auto-Actions', 'Depot Operations'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setAuditFilter(filter)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider shrink-0",
                                auditFilter === filter 
                                    ? "bg-white text-slate-800 shadow-sm ring-1 ring-black/5" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Audit Trail List Container */}
            <div className="dashboard-card p-0 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="divide-y divide-slate-100">
                    {filteredHistory.length > 0 ? filteredHistory.map((record) => {
                        const { icon, colorClass } = getIconAndColor(record);
                        const isAI = record.type === 'AI_Evaluation';

                        return (
                            <div key={record.id} className="p-6 hover:bg-slate-50/50 transition-colors animate-in fade-in duration-200">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                                    
                                    <div className="flex items-start gap-4">
                                        {/* Ledger Item Circle Icon */}
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm mt-1",
                                            colorClass
                                        )}>
                                            {icon}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {/* Header Row */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-base font-extrabold text-slate-900">{record.title}</h4>
                                                
                                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-400 border border-slate-200 tracking-wide">
                                                    ID: {record.id.split('-').slice(0, 3).join('-')}
                                                </span>

                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                                    record.operator === 'Supervisor' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    record.operator === 'Planner' ? "bg-blue-50 text-metro-blue border-blue-200" :
                                                    "bg-slate-100 text-slate-500 border-slate-200"
                                                )}>
                                                    {record.operator}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-slate-650 font-medium leading-relaxed max-w-3xl">
                                                {record.detail}
                                            </p>

                                            {/* AI Evaluation Metadata row */}
                                            {isAI && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold">
                                                        <Zap className="w-3.5 h-3.5 text-metro-orange" /> Score: {record.readinessScore}/30
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold font-mono">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" /> gemini-1.5-flash
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Secure
                                                    </span>
                                                </div>
                                            )}

                                            {/* Depot Operations: SCADA Diagnostics Panel */}
                                            {!isAI && record.scada && (
                                                <div className="mt-3.5 p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-md space-y-3 max-w-2xl">
                                                    <h5 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
                                                        <Activity className="w-3.5 h-3.5 text-metro-blue" />
                                                        Captured SCADA Telemetry Diagnostics
                                                    </h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-[11px] font-mono text-slate-350">
                                                        <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/30 flex flex-col justify-between">
                                                            <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">Brake Pad</span>
                                                            <span className="text-white font-extrabold mt-1">{record.scada.brakePad}</span>
                                                        </div>
                                                        <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/30 flex flex-col justify-between">
                                                            <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">Panto Force</span>
                                                            <span className="text-white font-extrabold mt-1">{record.scada.pantoForce}</span>
                                                        </div>
                                                        <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/30 flex flex-col justify-between">
                                                            <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">Vibration</span>
                                                            <span className="text-white font-extrabold mt-1">{record.scada.vibrations}</span>
                                                        </div>
                                                        <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/30 flex flex-col justify-between">
                                                            <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">Shoe Temp</span>
                                                            <span className="text-white font-extrabold mt-1">{record.scada.shoeTemp}</span>
                                                        </div>
                                                        <div className="col-span-2 md:col-span-1 p-2 bg-slate-800/80 rounded-xl border border-slate-700/30 flex flex-col justify-between">
                                                            <span className="text-[8px] text-slate-500 font-sans uppercase font-bold">Door Cycles</span>
                                                            <span className="text-white font-extrabold mt-1">{record.scada.doorCycles}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side Status Panel */}
                                    <div className="text-left lg:text-right shrink-0 lg:pl-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-end gap-3 lg:gap-1.5 min-w-[130px]">
                                        <span className={cn(
                                            "inline-block px-3 py-1 rounded-xl text-xs font-bold uppercase border shadow-sm",
                                            isAI 
                                                ? (record.decision?.includes('SERVICE') ? 'bg-red-50 border-red-150 text-red-600' : 'bg-green-50 border-green-150 text-emerald-600')
                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                        )}>
                                            {isAI ? record.decision : record.category}
                                        </span>
                                        <div className="lg:text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider hidden lg:block">Timestamp</p>
                                            <p className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                                                {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-16 text-center text-slate-500">
                            <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-slate-300 stroke-[1.5]" />
                            <h5 className="font-extrabold text-slate-700">No historical data available</h5>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No records found for the filter selection "{auditFilter}". Complete operations or run evaluations to populate this audit trail ledger.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

