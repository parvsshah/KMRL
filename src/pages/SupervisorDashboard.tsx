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
    Ban,
    Activity,
    Wrench,
    Sparkles,
    Eye,
    Clock
} from 'lucide-react';
import { cn, getSCADAMetrics } from '../utils';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../services/supabase';

export const SupervisorDashboard = () => {
    const { 
        fleet, setFleet, schedule, setSchedule,
        coaches, setCoaches, 
        maintenanceBays, setMaintenanceBays, 
        cleaningBays, setCleaningBays,
        history, setHistory
    } = useAppContext();

    // Modals & Popups states
    const [reportModalSchedId, setReportModalSchedId] = useState<string | null>(null);
    const [swapModalActiveInfo, setSwapModalActiveInfo] = useState<{ activeTrainId: string; scheduleId: string } | null>(null);
    const [selectedBay, setSelectedBay] = useState<any | null>(null);

    const [bayComments, setBayComments] = useState<Record<string, string>>(() => {
        const comments: Record<string, string> = {};
        try {
            const bayIds = ['M-BAY-1', 'M-BAY-2', 'M-BAY-3', 'C-BAY-1', 'C-BAY-2', 'C-BAY-3', 'C-BAY-4'];
            bayIds.forEach(id => {
                const stored = localStorage.getItem(`bay_comment_${id}`);
                if (stored) {
                    comments[id] = stored;
                }
            });
        } catch (e) {
            console.error("Error loading comments from localStorage", e);
        }
        return comments;
    });

    const [commentInput, setCommentInput] = useState<string>('');
    const [isSavingComment, setIsSavingComment] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    React.useEffect(() => {
        if (selectedBay) {
            setCommentInput(bayComments[selectedBay.id] || '');
            setSaveSuccess(false);
        }
    }, [selectedBay, bayComments]);

    const saveBayComment = (bayId: string) => {
        setIsSavingComment(true);
        try {
            localStorage.setItem(`bay_comment_${bayId}`, commentInput);
            setBayComments(prev => ({
                ...prev,
                [bayId]: commentInput
            }));

            // Capture SCADA Telemetry if a coach is occupying the bay
            const isMaint = bayId.startsWith('M-');
            const bay = (isMaint ? maintenanceBays : cleaningBays).find(b => b.id === bayId);
            const occupyingCoach = bay?.currentTask;
            const scada = occupyingCoach ? getSCADAMetrics(occupyingCoach) : undefined;

            const logEntry = {
                id: `AUD-COM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Depot Operations',
                title: 'Supervisor Comment Filed',
                detail: `Supervisor filed comment on Bay ${bayId}${occupyingCoach ? ` (Occupying Coach: ${occupyingCoach})` : ''}: "${commentInput}"`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                bayId,
                coachId: occupyingCoach || undefined,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e) {
            console.error("Error saving comment", e);
        } finally {
            setIsSavingComment(false);
        }
    };

    const toggleBayFunctionality = async (bayId: string, type: 'Maintenance' | 'Cleaning') => {
        const isMaint = type === 'Maintenance';
        const baysList = isMaint ? maintenanceBays : cleaningBays;
        const setBays = isMaint ? setMaintenanceBays : setCleaningBays;
        const bay = baysList.find(b => b.id === bayId);
        if (!bay) return;

        const nextFunctional = !bay.functional;
        const nextStatus = nextFunctional ? 'Available' : 'Maintenance';

        try {
            const { error } = await supabase.from('bays')
                .update({ 
                    functional: nextFunctional,
                    status: nextStatus,
                    current_task: null
                })
                .eq('id', bayId);

            if (error) throw error;

            setBays(prev => prev.map(b => b.id === bayId ? {
                ...b,
                functional: nextFunctional,
                status: nextStatus,
                currentTask: null
            } : b));

            if (selectedBay && selectedBay.id === bayId) {
                setSelectedBay(prev => prev ? {
                    ...prev,
                    functional: nextFunctional,
                    status: nextStatus,
                    currentTask: null
                } : null);
            }

            alert(`Bay ${bayId} is now ${nextFunctional ? 'Online' : 'Offline (Maintenance)'}`);
        } catch (err: any) {
            console.error("Error toggling bay functionality:", err);
            alert("Failed to toggle bay status: " + err.message);
        }
    };

    const completeBayTask = async (bayId: string, type: 'Maintenance' | 'Cleaning', coachId: string) => {
        if (!confirm(`Are you sure you want to complete the servicing for Coach ${coachId} in ${bayId}?`)) return;

        const isMaint = type === 'Maintenance';
        const setBays = isMaint ? setMaintenanceBays : setCleaningBays;

        try {
            const { error: bayErr } = await supabase.from('bays')
                .update({ status: 'Available', current_task: null })
                .eq('id', bayId);
            if (bayErr) throw bayErr;

            const { error: coachErr } = await supabase.from('coaches')
                .update({ health: 100, status: 'Standby' })
                .eq('id', coachId);
            if (coachErr) throw coachErr;

            setBays(prev => prev.map(b => b.id === bayId ? { ...b, status: 'Available', currentTask: null } : b));
            setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, health: 100, status: 'Standby' } : c));

            setSelectedBay(null);
            alert(`Servicing complete! Coach ${coachId} is now fully operational (100% Health) and returned to Standby roster.`);
        } catch (err: any) {
            console.error("Error completing bay task:", err);
            alert("Failed to complete bay task: " + err.message);
        }
    };

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

            // Log to Audit Trail with SCADA telemetry for the primary coach
            const firstCoachId = targetTrain?.coaches?.[0];
            const scada = firstCoachId ? getSCADAMetrics(firstCoachId) : undefined;

            const logEntry = {
                id: `AUD-APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Approvals',
                title: 'Induction Proposal Approved',
                detail: `Supervisor approved induction for Trainset ${finalTrainId} onto Route: ${sched.route} (Run: ${runNumber}). Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: finalTrainId,
                coachId: firstCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            // Log to Audit Trail with SCADA telemetry for the primary coach
            const firstCoachId = unit?.coaches?.[0];
            const scada = firstCoachId ? getSCADAMetrics(firstCoachId) : undefined;

            const logEntry = {
                id: `AUD-REJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Rejections',
                title: 'Induction Proposal Rejected',
                detail: `Supervisor rejected induction proposal for Trainset ${trainId}. Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: trainId,
                coachId: firstCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            // Log to Audit Trail with SCADA telemetry for the promoted standby coach
            const standbyTrain = fleet.find(f => f.id === standbyId);
            const firstStandbyCoachId = standbyTrain?.coaches?.[0];
            const scada = firstStandbyCoachId ? getSCADAMetrics(firstStandbyCoachId) : undefined;

            const logEntry = {
                id: `AUD-SWAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Depot Operations',
                title: 'Standby Swap Executed',
                detail: `Supervisor executed Hot Standby Swap: replaced Disputed ${activeId} with Standby ${standbyId} on schedule run ${sched.runNumber || 'N/A'}. Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: standbyId,
                coachId: firstStandbyCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            // Log to Audit Trail with SCADA telemetry for the canceled trainset's coach
            const activeTrain = fleet.find(f => f.id === activeTrainId);
            const firstActiveCoachId = activeTrain?.coaches?.[0];
            const scada = firstActiveCoachId ? getSCADAMetrics(firstActiveCoachId) : undefined;

            const logEntry = {
                id: `AUD-CNCL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Depot Operations',
                title: 'Active Service Canceled',
                detail: `Supervisor canceled and terminated the active service for Trainset ${activeTrainId}. Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: activeTrainId,
                coachId: firstActiveCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            // Log to Audit Trail with SCADA telemetry for the recalled trainset's coach
            const targetTrain = fleet.find(f => f.id === trainId);
            const firstCoachId = targetTrain?.coaches?.[0];
            const scada = firstCoachId ? getSCADAMetrics(firstCoachId) : undefined;

            const logEntry = {
                id: `AUD-RCLR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Depot Operations',
                title: 'Recall Authorized',
                detail: `Supervisor authorized recall for Trainset ${trainId}: returned to Standby. Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: trainId,
                coachId: firstCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            // Log to Audit Trail with SCADA telemetry for the denied recall trainset's coach
            const targetTrain = fleet.find(f => f.id === trainId);
            const firstCoachId = targetTrain?.coaches?.[0];
            const scada = firstCoachId ? getSCADAMetrics(firstCoachId) : undefined;

            const logEntry = {
                id: `AUD-RCLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'Depot_Operation',
                category: 'Depot Operations',
                title: 'Recall Denied',
                detail: `Supervisor denied recall request for Trainset ${trainId}. Primary coach SCADA data captured.`,
                timestamp: new Date().toISOString(),
                operator: 'Supervisor',
                trainsetId: trainId,
                coachId: firstCoachId,
                scada
            };
            setHistory(prev => [logEntry as any, ...prev]);

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

            {/* Depot Operations & Live Bay Control Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-metro-blue" /> Depot Operations: Live Bay Control
                        </h3>
                        <p className="text-xs text-slate-500">Monitor maintenance and cleaning bays, toggle operational availability, and view active coach servicing status.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Maintenance & Cleaning Bays Lists (Occupies 2/3 columns on large screens) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Maintenance Bays Subgrid */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-metro-orange" />
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Maintenance Bays (M-Bays)</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {maintenanceBays.map(bay => {
                                    const isSelected = selectedBay && selectedBay.id === bay.id;
                                    const occupyingCoach = bay.currentTask;
                                    return (
                                        <div 
                                            key={bay.id} 
                                            onClick={() => setSelectedBay({ ...bay, type: 'Maintenance' })}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-sm flex flex-col justify-between min-h-[140px]",
                                                isSelected 
                                                    ? "bg-slate-50 border-metro-orange ring-1 ring-metro-orange shadow-md" 
                                                    : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{bay.id}</span>
                                                    <h5 className="font-extrabold text-slate-800 mt-0.5">{bay.id}</h5>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                    !bay.functional 
                                                        ? "bg-slate-100 text-slate-500 border border-slate-200" 
                                                        : bay.status === 'Occupied' 
                                                            ? "bg-amber-50 text-metro-orange border border-amber-250 animate-pulse" 
                                                            : "bg-emerald-50 text-emerald-600 border border-emerald-250"
                                                )}>
                                                    {!bay.functional ? 'Offline' : bay.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Current Assignment</p>
                                                {bay.status === 'Occupied' && occupyingCoach ? (
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                                                        <div className="w-2 h-2 rounded-full bg-metro-orange animate-ping shrink-0" />
                                                        <span>Coach {occupyingCoach}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-500 font-semibold">{!bay.functional ? 'Bay Deactivated' : 'Ready / Open'}</p>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100/50">
                                                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    {!bay.functional ? 'Inactive' : bay.status === 'Occupied' ? 'In Progress' : 'Idle'}
                                                </span>
                                                <span className="text-[10px] font-black text-metro-orange opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                                    Inspect <ChevronRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cleaning Bays Subgrid */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-metro-blue" />
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Cleaning Bays (C-Bays)</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {cleaningBays.map(bay => {
                                    const isSelected = selectedBay && selectedBay.id === bay.id;
                                    const occupyingCoach = bay.currentTask;
                                    return (
                                        <div 
                                            key={bay.id} 
                                            onClick={() => setSelectedBay({ ...bay, type: 'Cleaning' })}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-sm flex flex-col justify-between min-h-[140px]",
                                                isSelected 
                                                    ? "bg-slate-50 border-metro-blue ring-1 ring-metro-blue shadow-md" 
                                                    : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-350"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{bay.id}</span>
                                                    <h5 className="font-extrabold text-slate-800 mt-0.5">{bay.id}</h5>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                    !bay.functional 
                                                        ? "bg-slate-100 text-slate-500 border border-slate-200" 
                                                        : bay.status === 'Occupied' 
                                                            ? "bg-sky-50 text-metro-blue border border-sky-250 animate-pulse" 
                                                            : "bg-emerald-50 text-emerald-600 border border-emerald-250"
                                                )}>
                                                    {!bay.functional ? 'Offline' : bay.status}
                                                </span>
                                            </div>

                                            <div className="mt-4 space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Current Assignment</p>
                                                {bay.status === 'Occupied' && occupyingCoach ? (
                                                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                                                        <div className="w-2 h-2 rounded-full bg-metro-blue animate-ping shrink-0" />
                                                        <span>Coach {occupyingCoach}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-500 font-semibold">{!bay.functional ? 'Bay Deactivated' : 'Ready / Open'}</p>
                                                )}
                                            </div>

                                            <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100/50">
                                                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    {!bay.functional ? 'Inactive' : bay.status === 'Occupied' ? 'In Progress' : 'Idle'}
                                                </span>
                                                <span className="text-[10px] font-black text-metro-blue opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                                    Inspect <ChevronRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Selected Bay Information Panel (Occupies 1/3 columns) */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between min-h-[350px]">
                        {selectedBay ? (() => {
                            const bayData = selectedBay.type === 'Maintenance' 
                                ? maintenanceBays.find(b => b.id === selectedBay.id) 
                                : cleaningBays.find(b => b.id === selectedBay.id);
                            
                            if (!bayData) return <div className="text-center text-slate-400 text-xs font-semibold my-auto">Bay info unavailable</div>;

                            const occupyingCoach = bayData.currentTask;
                            const coach = occupyingCoach ? coaches.find(c => c.id === occupyingCoach) : null;
                            const isMaint = selectedBay.type === 'Maintenance';

                            // Generate realistic SCADA Telemetry based on coach ID or some stable attributes
                            const getSCADAMetrics = (cId: string) => {
                                const num = parseInt(cId.replace(/[^0-9]/g, '')) || 100;
                                return {
                                    brakePad: ((num % 5) + 3.2).toFixed(1) + " mm",
                                    pantoForce: ((num % 30) + 75) + " N",
                                    vibrations: ((num % 10) / 100 + 0.02).toFixed(2) + " g",
                                    shoeTemp: ((num % 15) + 38) + " °C",
                                    doorCycles: ((num * 120) % 10000 + 12000).toLocaleString()
                                };
                            };

                            const metrics = coach ? getSCADAMetrics(coach.id) : null;

                            return (
                                <div className="space-y-5 flex-1 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                {isMaint ? <Wrench className="w-5 h-5 text-metro-orange" /> : <Sparkles className="w-5 h-5 text-metro-blue" />}
                                                <div>
                                                    <h4 className="font-extrabold text-slate-800 text-sm">{bayData.id}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedBay.type} Service Bay</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedBay(null)} 
                                                className="p-1 text-slate-400 hover:text-slate-655 hover:bg-slate-200/50 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Bay Operational Status (Read-Only) */}
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Operational Status</span>
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                                    bayData.functional 
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-250" 
                                                        : "bg-red-50 text-red-600 border-red-250"
                                                )}>
                                                    {bayData.functional ? 'ONLINE / ACTIVE' : 'OFFLINE / INACTIVE'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                                                {bayData.functional 
                                                    ? "This bay is online and visible to yard planners for coach assignment." 
                                                    : "This bay is currently marked offline. Yard planners cannot assign coaches here."}
                                            </p>
                                        </div>

                                        {/* Supervisor Log Comments Box */}
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <h5 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 text-metro-blue" />
                                                    Supervisor Log Entries
                                                </h5>
                                                {bayComments[bayData.id] && (
                                                    <span className="text-[9px] bg-slate-100 text-slate-505 px-1.5 py-0.5 rounded font-mono font-bold">
                                                        Log Active
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <textarea
                                                    value={commentInput}
                                                    onChange={(e) => setCommentInput(e.target.value)}
                                                    placeholder="File operational notes, bay condition logs, or maintenance directives here..."
                                                    className="w-full min-h-[90px] p-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-metro-blue focus:bg-white rounded-xl focus:outline-none resize-none transition-all placeholder:text-slate-400 text-slate-700 font-semibold leading-relaxed"
                                                />
                                                
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-[9.5px] text-slate-400 font-semibold">
                                                        {saveSuccess ? (
                                                            <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Log saved successfully
                                                            </span>
                                                        ) : (
                                                            "Notes are shared with Planners"
                                                        )}
                                                    </span>
                                                    <button
                                                        onClick={() => saveBayComment(bayData.id)}
                                                        disabled={isSavingComment}
                                                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-black tracking-wider uppercase hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
                                                    >
                                                        {isSavingComment ? 'Saving...' : 'Save Log Entry'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Occupying Coach Details */}
                                        {!bayData.functional ? (
                                            <div className="p-8 text-center bg-slate-100/50 border border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
                                                <Ban className="w-8 h-8 mx-auto mb-2 text-slate-350" />
                                                Bay deactivated. Turn online to receive coaches.
                                            </div>
                                        ) : bayData.status === 'Occupied' && coach ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">OCCUPYING VEHICLE</span>
                                                            <h5 className="font-black text-slate-800 text-sm">{coach.id}</h5>
                                                        </div>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border",
                                                            coach.type === 'DMC' ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"
                                                        )}>
                                                            {coach.type} Coach
                                                        </span>
                                                    </div>

                                                    {/* Health gauge */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                                                            <span>Telemetry Wear Health</span>
                                                            <span className={cn(
                                                                "font-bold",
                                                                coach.health > 80 ? "text-emerald-600" : coach.health > 50 ? "text-amber-600" : "text-red-600"
                                                            )}>{coach.health}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className={cn(
                                                                    "h-full rounded-full transition-all duration-500",
                                                                    coach.health > 80 ? "bg-emerald-500" : coach.health > 50 ? "bg-amber-500" : "bg-red-500"
                                                                )}
                                                                style={{ width: `${coach.health}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                                                        <div>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">ACCUMULATED MILEAGE</span>
                                                            <span className="font-extrabold text-slate-700 font-mono">{coach.mileage.toLocaleString()} KM</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase block">MAINT. STATUS</span>
                                                            <span className="font-extrabold text-slate-700">{coach.maintenanceStatus}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SCADA Telemetry Subsystem Readings */}
                                                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                                                    <h5 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <Activity className="w-3.5 h-3.5 text-metro-blue" />
                                                        SCADA Diagnostic Telemetry
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-655 font-mono">
                                                        <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                                            <span className="text-slate-400 font-sans">Brake Pad:</span>
                                                            <span className="text-slate-800 font-bold">{metrics?.brakePad}</span>
                                                        </div>
                                                        <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                                            <span className="text-slate-400 font-sans">Panto Force:</span>
                                                            <span className="text-slate-800 font-bold">{metrics?.pantoForce}</span>
                                                        </div>
                                                        <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                                            <span className="text-slate-400 font-sans">Vibration:</span>
                                                            <span className="text-slate-800 font-bold">{metrics?.vibrations}</span>
                                                        </div>
                                                        <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                                            <span className="text-slate-400 font-sans">Shoe Temp:</span>
                                                            <span className="text-slate-800 font-bold">{metrics?.shoeTemp}</span>
                                                        </div>
                                                        <div className="col-span-2 p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between items-center">
                                                            <span className="text-slate-400 font-sans">Door Cycle Count:</span>
                                                            <span className="text-slate-800 font-bold">{metrics?.doorCycles}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-white border border-slate-200 border-dashed rounded-xl text-slate-400 text-xs font-semibold">
                                                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/80" />
                                                Bay stabling track clear. Ready to receive next coach.
                                            </div>
                                        )}
                                    </div>

                                    {/* Read-Only Status for Supervisor */}
                                    {bayData.functional && bayData.status === 'Occupied' && coach && (
                                        <div className="p-3 bg-amber-50/60 border border-amber-150 rounded-xl text-[10.5px] text-amber-700 font-bold flex items-center gap-2 mt-4 shadow-sm">
                                            <Clock className="w-4 h-4 shrink-0 text-metro-orange animate-pulse" />
                                            <span>Active servicing in progress. Servicing release controls are reserved for Yard Planners.</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })() : (
                            <div className="my-auto text-center p-6 space-y-3">
                                <Eye className="w-10 h-10 text-slate-350 mx-auto" />
                                <div>
                                    <h4 className="font-extrabold text-slate-700 text-sm">Select a Bay to Inspect</h4>
                                    <p className="text-xs text-slate-400 mt-1">Select a stabling maintenance or cleaning bay from the grid to view operational metrics, SCADA telemetry diagnostic logs, or to execute service completion updates.</p>
                                </div>
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
