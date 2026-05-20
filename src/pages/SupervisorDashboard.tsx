import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    AlertTriangle, 
    ShieldCheck, 
    Zap, 
    Navigation, 
    CheckCircle2, 
    ChevronRight, 
    X,
    FileText,
    ArrowLeftRight,
    Ban
} from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../services/supabase';

export const SupervisorDashboard = () => {
    const { 
        fleet, setFleet, schedule, setSchedule,
        coaches, setCoaches, maintenanceBays, cleaningBays
    } = useAppContext();

    // Modals & Popups states
    const [reportModalSchedId, setReportModalSchedId] = useState<string | null>(null);
    const [swapModalActiveInfo, setSwapModalActiveInfo] = useState<{ activeTrainId: string; scheduleId: string } | null>(null);

    const pendingApprovals = schedule.filter(s => s.controlStatus === 'Pending');
    const activeTrains = schedule.filter(s => s.controlStatus === 'Approved');
    const pendingRecalls = fleet.filter(f => f.recallRequested);

    // One-click Authorize (uses proposed planned parameters as-submitted)
    const supervisorApprove = async (id: string) => {
        const sched = schedule.find(s => s.id === id);
        if (!sched) return;

        try {
            const isLine1 = sched.route?.includes('Line 1');
            const runNumber = sched.runNumber || `${isLine1 ? 'R' : 'S'}-${Math.floor(Math.random() * 90 + 10)}`;
            const finalTrainId = sched.trainId;
            const targetTrain = fleet.find(f => f.id === finalTrainId);
            const branding = targetTrain?.branding || 'Standard';

            // 1. Update Schedule in DB
            const { error: schedErr } = await supabase.from('schedule_items')
                .update({ 
                    control_status: 'Approved', 
                    status: 'Active',
                    run_number: runNumber
                })
                .eq('id', id);
            if (schedErr) throw schedErr;

            // 2. Update Fleet in DB
            const { error: fleetErr } = await supabase.from('fleet_units')
                .update({ 
                    status: 'In Service', 
                    maintenance_required: false, 
                    cleaning_required: false,
                    route: sched.route,
                    branding: branding,
                    start_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    run_number: runNumber
                })
                .eq('id', finalTrainId);
            if (fleetErr) throw fleetErr;

            // 3. Optimistic Context Updates
            setSchedule(prev => prev.map(s => s.id === id ? { 
                ...s, 
                controlStatus: 'Approved', 
                status: 'Active',
                runNumber: runNumber
            } : s));
            
            setFleet(prev => prev.map(f => {
                if (f.id === finalTrainId) {
                    return {
                        ...f, 
                        status: 'In Service', 
                        maintenanceRequired: false, 
                        cleaningRequired: false,
                        route: sched.route,
                        branding: branding,
                        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        runNumber: runNumber
                    };
                }
                return f;
            }));

            // Close modals
            setReportModalSchedId(null);
            alert(`Induction approved! ${finalTrainId} is now Active In-Service.`);
        } catch (err: any) {
            console.error("Error approving schedule:", err);
            alert("Failed to sync approval to database: " + err.message);
        }
    };

    const supervisorReject = async (id: string, trainId: string) => {
        try {
            // Delete schedule item
            const { error: schedErr } = await supabase.from('schedule_items').delete().eq('id', id);
            if (schedErr) throw schedErr;

            // Revert coaches to Standby
            const unit = fleet.find(f => f.id === trainId);
            if (unit && unit.coaches) {
                for (const c of unit.coaches) {
                    await supabase.from('coaches').update({ status: 'Standby' }).eq('id', c);
                }
            }

            // Optimistic Context Updates
            setSchedule(prev => prev.filter(s => s.id !== id));
            setCoaches(prev => prev.map(c => unit?.coaches.includes(c.id) ? { ...c, status: 'Standby' } : c));
            setFleet(prev => prev.filter(f => f.id !== trainId)); 

            setReportModalSchedId(null);
            alert("Schedule proposal successfully rejected.");
        } catch (err: any) {
            console.error("Error rejecting schedule:", err);
            alert("Failed to sync rejection: " + err.message);
        }
    };

    // Dispute & Swap Active trainset with first available Standby trainset
    const executeStandbySwap = async (activeId: string, standbyId: string, schedId: string) => {
        const sched = schedule.find(s => s.id === schedId);
        if (!sched) return;

        try {
            // 1. Demote the active trainset to Standby
            const { error: activeErr } = await supabase.from('fleet_units')
                .update({
                    status: 'Standby',
                    route: null,
                    start_time: null,
                    run_number: null
                })
                .eq('id', activeId);
            if (activeErr) throw activeErr;

            // 2. Promote the standby trainset to In Service taking over the parameters
            const { error: standbyErr } = await supabase.from('fleet_units')
                .update({
                    status: 'In Service',
                    route: sched.route,
                    branding: 'Standard',
                    start_time: sched.time,
                    run_number: sched.runNumber
                })
                .eq('id', standbyId);
            if (standbyErr) throw standbyErr;

            // 3. Update Schedule item with new trainset ID
            const { error: schedErr } = await supabase.from('schedule_items')
                .update({
                    train_id: standbyId
                })
                .eq('id', schedId);
            if (schedErr) throw schedErr;

            // 4. Optimistic Context Updates
            setSchedule(prev => prev.map(s => s.id === schedId ? {
                ...s,
                trainId: standbyId
            } : s));

            setFleet(prev => prev.map(f => {
                if (f.id === activeId) {
                    return {
                        ...f,
                        status: 'Standby',
                        route: null,
                        startTime: null,
                        runNumber: undefined
                    };
                }
                if (f.id === standbyId) {
                    return {
                        ...f,
                        status: 'In Service',
                        route: sched.route,
                        startTime: sched.time,
                        runNumber: sched.runNumber
                    };
                }
                return f;
            }));

            setSwapModalActiveInfo(null);
            alert(`Hot Standby Swap Committed! Disputed ${activeId} replaced with Standby ${standbyId} on active schedule.`);
        } catch (err: any) {
            console.error("Error executing standby swap:", err);
            alert("Disputed swap failed: " + err.message);
        }
    };

    // Cancel Active Schedule completely
    const cancelActiveTrain = async (activeTrainId: string, schedId: string) => {
        if (!confirm(`Are you absolutely sure you want to cancel and terminate the active service for ${activeTrainId}?`)) return;
        
        try {
            // 1. Delete schedule item
            const { error: schedErr } = await supabase.from('schedule_items').delete().eq('id', schedId);
            if (schedErr) throw schedErr;

            // 2. Demote trainset to Standby
            const { error: fleetErr } = await supabase.from('fleet_units')
                .update({
                    status: 'Standby',
                    route: null,
                    start_time: null,
                    run_number: null
                })
                .eq('id', activeTrainId);
            if (fleetErr) throw fleetErr;

            // 3. Optimistic updates
            setSchedule(prev => prev.filter(s => s.id !== schedId));
            setFleet(prev => prev.map(f => f.id === activeTrainId ? {
                ...f,
                status: 'Standby',
                route: null,
                startTime: null,
                runNumber: undefined
            } : f));

            alert(`Active run for ${activeTrainId} successfully canceled.`);
        } catch (err: any) {
            console.error("Error canceling active run:", err);
            alert("Failed to cancel active run: " + err.message);
        }
    };

    const authorizeRecall = async (trainId: string) => {
        try {
            const { error: schedErr } = await supabase.from('schedule_items').delete().eq('train_id', trainId);
            if (schedErr) throw schedErr;

            const { error: fleetErr } = await supabase.from('fleet_units')
                .update({ 
                    status: 'Standby',
                    route: null,
                    start_time: null,
                    run_number: null,
                    recall_requested: false
                })
                .eq('id', trainId);
            if (fleetErr) throw fleetErr;

            setSchedule(prev => prev.filter(s => s.trainId !== trainId));
            setFleet(prev => prev.map(f => f.id === trainId ? { 
                ...f, 
                status: 'Standby', 
                route: undefined, 
                startTime: undefined, 
                runNumber: undefined,
                recallRequested: false
            } : f));

            alert(`Recall Authorized. ${trainId} returned to Standby.`);
        } catch (err: any) {
            console.error("Error authorizing recall:", err);
            alert("Failed to authorize recall: " + err.message);
        }
    };

    const denyRecall = async (trainId: string) => {
        try {
            const { error } = await supabase.from('fleet_units')
                .update({ recall_requested: false })
                .eq('id', trainId);
            if (error) throw error;

            setFleet(prev => prev.map(f => f.id === trainId ? { ...f, recallRequested: false } : f));
        } catch (err: any) {
            console.error("Error denying recall:", err);
            alert("Failed to deny recall: " + err.message);
        }
    };

    const standbyUnits = fleet.filter(f => f.status === 'Standby');
    const selectedReportSched = schedule.find(s => s.id === reportModalSchedId);
    const selectedReportTrain = selectedReportSched ? fleet.find(f => f.id === selectedReportSched.trainId) : null;

    return (
        <section className="lg:col-span-12 space-y-6">
            
            {/* Bureau Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Supervisor Control Bureau</h2>
                    <p className="text-sm text-slate-500">Authorize active corridor schedules, review reports, and manage standby hot swaps.</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Approval</p>
                        <p className="text-2xl font-bold text-metro-orange leading-none">{pendingApprovals.length}</p>
                    </div>
                    <div className="text-right pl-4 border-l border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Active Network</p>
                        <p className="text-2xl font-bold text-green-600 leading-none">{activeTrains.length}</p>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Fleet Trainsets</p>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-slate-800 leading-none">{fleet.length}</span>
                        <span className="text-xs font-bold text-green-600">{fleet.filter(f => f.status === 'In Service').length} Active</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Coach Inventory</p>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-slate-800 leading-none">{coaches.length}</span>
                        <span className="text-xs font-bold text-slate-500">{coaches.filter(c => c.status === 'Standby').length} Standby</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Maintenance Bays</p>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-slate-800 leading-none">{maintenanceBays.filter(b => b.status === 'Occupied').length}/{maintenanceBays.length}</span>
                        <span className="text-xs font-bold text-metro-orange">In Use</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Cleaning Bays</p>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-slate-800 leading-none">{cleaningBays.filter(b => b.status === 'Occupied').length}/{cleaningBays.length}</span>
                        <span className="text-xs font-bold text-metro-blue">In Use</span>
                    </div>
                </div>
            </div>

            {/* Left and Right Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column: Authorizations and Recalls */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold flex items-center gap-2 text-slate-800">
                            <AlertTriangle className="w-5 h-5 text-metro-orange" /> Pending Authorizations
                        </h3>
                        
                        {pendingApprovals.length === 0 ? (
                            <div className="dashboard-card p-8 text-center bg-slate-50 border-dashed rounded-3xl">
                                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-500">No pending schedules require authorization.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingApprovals.map(sched => (
                                    <div key={sched.id} className="dashboard-card p-5 border-l-4 border-l-metro-orange bg-white border border-slate-200 rounded-2xl shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 block font-mono">REQ ID: {sched.id}</span>
                                                <h4 className="text-base font-extrabold text-slate-800">{sched.trainId}</h4>
                                                <p className="text-xs text-slate-500 font-semibold mt-1">Route: {sched.route}</p>
                                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Scheduled Departure: <span className="font-bold text-slate-650">{sched.time}</span></p>
                                            </div>
                                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-150 text-metro-orange rounded text-[10px] font-black uppercase tracking-wider animate-pulse">PENDING AUTH</span>
                                        </div>
                                        
                                        <div className="flex gap-2.5 mt-4">
                                            <button 
                                                onClick={() => setReportModalSchedId(sched.id)}
                                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex justify-center items-center gap-1.5 border border-slate-200 shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> View Report
                                            </button>
                                            <button 
                                                onClick={() => supervisorApprove(sched.id)}
                                                className="flex-1 py-2 bg-metro-blue text-white rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex justify-center items-center gap-1.5 shadow-sm"
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Authorize
                                            </button>
                                            <button 
                                                onClick={() => supervisorReject(sched.id, sched.trainId)}
                                                className="px-3.5 py-2 border border-red-200 text-red-500 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors shadow-sm"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {pendingRecalls.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold flex items-center gap-2 text-slate-800">
                                <AlertTriangle className="w-5 h-5 text-red-600" /> Formal Recall Requests
                            </h3>
                            <div className="space-y-4">
                                {pendingRecalls.map(unit => (
                                    <div key={unit.id} className="dashboard-card p-5 border-l-4 border-l-red-600 bg-red-50/50 rounded-2xl border border-red-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1 block">YARD RECALL REQ</span>
                                                <h4 className="text-lg font-bold text-slate-900">{unit.id}</h4>
                                                <p className="text-xs text-slate-500 font-medium mt-1">Currently: {unit.status} {unit.route ? `(${unit.route})` : ''}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold animate-pulse">PULL BACK</span>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button 
                                                onClick={() => authorizeRecall(unit.id)}
                                                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all flex justify-center items-center gap-2 animate-pulse"
                                            >
                                                <Zap className="w-4 h-4" /> Authorize Recall to Depot
                                            </button>
                                            <button 
                                                onClick={() => denyRecall(unit.id)}
                                                className="px-4 py-2 border border-slate-300 text-slate-600 bg-white rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Active Network Status */}
                <div className="space-y-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-800">
                        <Navigation className="w-5 h-5 text-metro-blue" /> Active Deployed Network status
                    </h3>
                    <div className="dashboard-card p-0 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-sm">
                        {activeTrains.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                                No trainsets currently operational on the corridor network.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto no-scrollbar">
                                {activeTrains.map(train => {
                                    return (
                                        <div key={train.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 text-emerald-500 border border-green-100 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-extrabold text-slate-800">{train.trainId}</h4>
                                                        {train.runNumber && <span className="bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm font-mono">{train.runNumber}</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-semibold">{train.route}</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Time: {train.time}</p>
                                                </div>
                                            </div>

                                            {/* Action triggers: Dispute Swap or Cancel Active */}
                                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                                                <button
                                                    onClick={() => setSwapModalActiveInfo({ activeTrainId: train.trainId, scheduleId: train.id })}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-650 tracking-wider uppercase transition-colors shadow-sm"
                                                    title="Dispute this induction and swap with an available Standby trainset"
                                                >
                                                    <ArrowLeftRight className="w-3 h-3 text-metro-blue" />
                                                    <span>Dispute & Swap</span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => cancelActiveTrain(train.trainId, train.id)}
                                                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 border border-red-150 hover:bg-red-50 hover:text-red-650 rounded-xl text-[10px] font-black text-red-500 tracking-wider uppercase transition-colors shadow-sm"
                                                    title="Terminate active run"
                                                >
                                                    <Ban className="w-3 h-3 text-red-400" />
                                                    <span>Cancel Run</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modals & Popups */}
            <AnimatePresence>
                
                {/* 1. Complete AI Evaluation Report Modal */}
                {reportModalSchedId && selectedReportSched && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-metro-blue/10 text-metro-blue flex items-center justify-center">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-800">AI Induction Report</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Trainset ID: {selectedReportSched.trainId}</p>
                                    </div>
                                </div>
                                <button onClick={() => setReportModalSchedId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Report Details Scroll Area */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-5 no-scrollbar text-xs">
                                
                                {/* Parameters card */}
                                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-2">
                                    <h4 className="font-bold text-slate-700 text-xs">Deployment Parameters</h4>
                                    <div className="grid grid-cols-2 gap-3 text-slate-600 font-medium">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Target corridor route</span>
                                            <p className="text-slate-800 font-bold mt-0.5">{selectedReportSched.route}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Scheduled departure</span>
                                            <p className="text-slate-800 font-bold mt-0.5">{selectedReportSched.time}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Planned run number</span>
                                            <p className="text-slate-800 font-bold mt-0.5 font-mono">{selectedReportSched.runNumber || "Auto-assigned (R-XX)"}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Planned branding scheme</span>
                                            <p className="text-slate-800 font-bold mt-0.5">{selectedReportTrain?.branding || "Standard"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Fitness grading matrix */}
                                <div className="space-y-2.5">
                                    <h4 className="font-bold text-slate-700 text-xs">Induction Evaluation Grades</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">⚡ Rolling Stock Fitness</span>
                                            <span className="font-black text-emerald-600">4.8/5.0</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">📋 Job Card Compliance</span>
                                            <span className="font-black text-emerald-600">5.0/5.0</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">🎨 Branding Alignment</span>
                                            <span className="font-black text-emerald-600">4.5/5.0</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">🛣️ Mileage Threshold</span>
                                            <span className="font-black text-emerald-600">4.0/5.0</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">🧼 Cleaning Frequency</span>
                                            <span className="font-black text-emerald-600">4.9/5.0</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl flex items-center justify-between">
                                            <span className="font-semibold text-slate-600">🚉 Stabling Track Fit</span>
                                            <span className="font-black text-emerald-600">4.6/5.0</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Predictive maintenance Wear assessment */}
                                <div className="p-4 border border-slate-200 rounded-2xl space-y-2">
                                    <h4 className="font-bold text-slate-700 text-xs">AI Wear Analysis & Inference</h4>
                                    <div className="flex items-center justify-between text-slate-600 font-semibold">
                                        <span>Wear health assessment</span>
                                        <span className="font-extrabold text-emerald-500">{selectedReportTrain?.health}% Healthy</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 font-semibold">
                                        <span>Current accumulated mileage</span>
                                        <span className="font-extrabold text-slate-750 font-mono">{selectedReportTrain?.mileage.toLocaleString()} KM</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 font-semibold">
                                        <span>Estimated Remaining Useful Life (RUL)</span>
                                        <span className="font-extrabold text-slate-750">2,840 KM</span>
                                    </div>
                                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-metro-blue font-bold flex items-center gap-1.5 mt-2">
                                        <ShieldCheck className="w-4 h-4 shrink-0" />
                                        <span>Urgency level directive: MONITOR CLOSELY (Normal induction suggested)</span>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                                <button 
                                    onClick={() => setReportModalSchedId(null)}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Close Report
                                </button>
                                <button 
                                    onClick={() => supervisorApprove(selectedReportSched.id)}
                                    className="flex-1 py-3 bg-metro-blue text-white rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex justify-center items-center gap-1.5 shadow-sm"
                                >
                                    <Zap className="w-4 h-4" /> Authorize Induction
                                </button>
                                <button 
                                    onClick={() => supervisorReject(selectedReportSched.id, selectedReportSched.trainId)}
                                    className="px-4 py-3 border border-red-200 text-red-500 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors shadow-sm shrink-0"
                                >
                                    Reject
                                </button>
                            </div>

                        </motion.div>
                    </motion.div>
                )}

                {/* 2. Hot Standby Swap Selection Modal */}
                {swapModalActiveInfo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Hot Standby Swap</h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Disputing deployment of active trainset: <span className="text-slate-600 font-bold">{swapModalActiveInfo.activeTrainId}</span></p>
                                </div>
                                <button onClick={() => setSwapModalActiveInfo(null)} className="p-1.5 text-slate-400 hover:text-slate-655 rounded-full hover:bg-slate-100">
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div className="space-y-4 my-5 text-xs">
                                <div className="p-3.5 bg-amber-50 border border-amber-100 text-metro-orange font-bold rounded-2xl flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p className="leading-normal">
                                        This hot swap will instantly cancel the corridor run for active trainset {swapModalActiveInfo.activeTrainId}, return it to Standby status, and promote the selected Standby unit to In-Service.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Select Target Standby Hot Spare</label>
                                    
                                    {standbyUnits.length === 0 ? (
                                        <p className="p-4 text-center border border-dashed border-red-200 bg-red-50 text-red-500 font-bold rounded-2xl">
                                            No Standby trainsets are currently available in Muttom Yard! Swap cannot proceed.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-0.5 no-scrollbar">
                                            {standbyUnits.map(unit => (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => executeStandbySwap(swapModalActiveInfo.activeTrainId, unit.id, swapModalActiveInfo.scheduleId)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 hover:border-metro-blue/60 hover:bg-slate-100/50 rounded-2xl text-left flex items-center justify-between transition-all group/item shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-slate-700 text-[11px]">
                                                            {unit.id}
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-slate-700 group-hover/item:text-metro-blue transition-colors">{unit.id}</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{unit.coaches.length} Coaches</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-700">{unit.health}% Health</p>
                                                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{unit.mileage.toLocaleString()} KM</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2.5 mt-5">
                                <button 
                                    onClick={() => setSwapModalActiveInfo(null)} 
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-colors shadow-sm"
                                >
                                    Cancel
                                </button>
                            </div>

                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>

        </section>
    );
};
