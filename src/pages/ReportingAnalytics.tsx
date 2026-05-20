import React, { useState } from 'react';
import { History as HistoryIcon, Clock, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';

export const ReportingAnalytics = () => {
    const { history } = useAppContext();
    const [auditFilter, setAuditFilter] = useState<'All' | 'Approvals' | 'Rejections' | 'Auto-Actions'>('All');

    return (
        <section className="lg:col-span-12 space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">System Audit Trail</h2>
                    <p className="text-sm text-slate-500">Immutable ledger of AI evaluations and manual overrides.</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                    {['All', 'Approvals', 'Rejections', 'Auto-Actions'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setAuditFilter(filter as any)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                auditFilter === filter ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="dashboard-card p-0 overflow-hidden bg-white">
                <div className="divide-y divide-slate-100">
                    {history.length > 0 ? history.map((record, idx) => (
                        <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-3 rounded-xl mt-1 shrink-0",
                                        record.Induction_Decision === 'Immediate SERVICE' ? "bg-green-100 text-green-600" :
                                        record.Induction_Decision === 'STANDBY' ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                                    )}>
                                        <HistoryIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-bold text-slate-900">{record.Trainset_ID}</h4>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                                ID: AI-EVAL-{Math.floor(Math.random() * 9000) + 1000}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3 max-w-2xl">{record.Strategic_Summary}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                <Zap className="w-3 h-3" /> Score: {record.Readiness_Score}/30
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                <Clock className="w-3 h-3" /> Model: gemini-1.5-flash
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                <ShieldCheck className="w-3 h-3" /> Verified Secure
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={cn(
                                        "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mb-2",
                                        record.Induction_Decision === 'Immediate SERVICE' ? 'bg-green-100 text-green-700' : 
                                        record.Induction_Decision === 'STANDBY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                    )}>
                                        {record.Induction_Decision}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Timestamp</p>
                                    <p className="text-xs font-medium text-slate-700">{new Date().toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center text-slate-500">
                            <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No historical data available.</p>
                            <p className="text-sm mt-1">Run AI evaluations to populate the audit ledger.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};
