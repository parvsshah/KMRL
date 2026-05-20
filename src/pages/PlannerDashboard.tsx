import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Train, Settings, AlertCircle, CheckCircle2, Clock, 
    Plus, Wrench, Trash2, Layers, ArrowRightLeft, Zap, Calendar, Activity, Info, ClipboardList,
    ChevronDown, Search
} from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';
import { CoachInstance, FormData, ReportData } from '../types';
import { analyzeInductionReadiness } from '../services/api';
import { supabase } from '../services/supabase';

// Removed systemInstruction and responseSchema as we use the mock api service now

export const PlannerDashboard = () => {
    const { 
        coaches, setCoaches, fleet, setFleet, schedule, setSchedule,
        maintenanceQueue, setMaintenanceQueue, cleaningQueue, setCleaningQueue,
        maintenanceBays, setMaintenanceBays, cleaningBays, setCleaningBays,
        report, setReport, setHistory
    } = useAppContext();

    const [inductionTab, setInductionTab] = useState<'composition' | 'maintenance'>('composition');
    const [editingTrainsetId, setEditingTrainsetId] = useState<string | null>(null);
    const [coachFilter, setCoachFilter] = useState<'All' | 'Active' | 'Standby' | 'Idle'>('All');
    const [viewingCoach, setViewingCoach] = useState<CoachInstance | null>(null);
    const [modalTab, setModalTab] = useState<'single' | 'fleet'>('single');
    const [fleetReportSearch, setFleetReportSearch] = useState('');
    const [coachSearch, setCoachSearch] = useState('');
    const [coachTypeFilter, setCoachTypeFilter] = useState<'All' | 'Driving' | 'Trailer'>('All');
    
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [selectSearch, setSelectSearch] = useState('');
    
    const [isModifySelectOpen, setIsModifySelectOpen] = useState(false);
    const [modifySelectSearch, setModifySelectSearch] = useState('');
    
    const [formData, setFormData] = useState<FormData>({
        trainsetId: '',
        description: 'Routine scheduled induction request.',
        mileageKm: 0,
        selectedCoaches: [],
    });

    const [maintScheduleData, setMaintScheduleData] = useState({
        coachId: '',
        type: 'A-Check' as 'A-Check' | 'B-Check' | 'Corrective Repair' | 'Cleaning',
        durationHours: 2, // Fixed duration as per requirement
        bayId: ''
    });

    const [maintenanceTypesRequired, setMaintenanceTypesRequired] = useState({
        'A-Check': true,
        'B-Check': true,
        'Corrective Repair': true,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (maintScheduleData.type === 'A-Check' && !maintenanceTypesRequired['A-Check']) {
            setMaintScheduleData(p => ({ ...p, type: maintenanceTypesRequired['B-Check'] ? 'B-Check' : maintenanceTypesRequired['Corrective Repair'] ? 'Corrective Repair' : 'Cleaning' }));
        } else if (maintScheduleData.type === 'B-Check' && !maintenanceTypesRequired['B-Check']) {
            setMaintScheduleData(p => ({ ...p, type: maintenanceTypesRequired['Corrective Repair'] ? 'Corrective Repair' : 'Cleaning' }));
        } else if (maintScheduleData.type === 'Corrective Repair' && !maintenanceTypesRequired['Corrective Repair']) {
            setMaintScheduleData(p => ({ ...p, type: 'Cleaning' }));
        }
    }, [maintenanceTypesRequired]);

    // Automatically default to "Modify" mode if fleet data is available and nothing is selected
    useEffect(() => {
        if (fleet.length > 0 && !editingTrainsetId && inductionTab === 'composition' && formData.trainsetId === '') {
            modifyTrainsetInService(fleet[0].id);
        }
    }, [fleet, editingTrainsetId, inductionTab]);

    // Keep mileageKm synchronized with the sum of the selected coaches' mileages
    useEffect(() => {
        const coachMileageCount = formData.selectedCoaches.reduce((acc, id) => {
            const coach = coaches.find(c => c.id === id);
            return acc + (coach ? coach.mileage : 0);
        }, 0);
        
        setFormData(prev => {
            if (prev.mileageKm !== coachMileageCount) {
                return { ...prev, mileageKm: coachMileageCount };
            }
            return prev;
        });
    }, [formData.selectedCoaches, coaches]);

    const getEnrichedHistory = (coach: CoachInstance) => {
        if (coach.history && coach.history.length > 0) {
            return coach.history;
        }

        const records = [];
        const mileage = coach.mileage || 1200;

        // Base commissioning
        records.push({
            id: `REC-COMM-${coach.id}`,
            date: '2025-10-15',
            type: 'Periodic' as const,
            description: `Initial commissioning & electrical system certification for ${coach.id} at Muttom Depot yard.`,
            technician: 'R. K. Nair'
        });

        // 5k A check
        if (mileage >= 5000) {
            records.push({
                id: `REC-A1-${coach.id}`,
                date: '2025-12-10',
                type: 'Periodic' as const,
                description: 'Routine 5,000 km "A" Service Inspection: checked bogie undercarriage, air conditioning components, and pantograph contact force.',
                technician: 'K. R. Pillai'
            });
        }

        // 10k A check
        if (mileage >= 10000) {
            records.push({
                id: `REC-A2-${coach.id}`,
                date: '2026-02-18',
                type: 'Periodic' as const,
                description: 'Routine 10,000 km "A" Service Inspection: brake pad thickness analysis, emergency communication systems check, and door alignment calibration.',
                technician: 'S. Raghavan'
            });
        }

        // 15k B check
        if (mileage >= 15000) {
            records.push({
                id: `REC-B1-${coach.id}`,
                date: '2026-04-05',
                type: 'Periodic' as const,
                description: 'Routine 15,000 km "B" Service Inspection: dynamic traction motor performance test, dynamic braking load check, wheel lathe profiling, and HVAC sanitization.',
                technician: 'M. P. Menon'
            });
        }

        // 20k A check
        if (mileage >= 20000) {
            records.push({
                id: `REC-A3-${coach.id}`,
                date: '2026-05-02',
                type: 'Periodic' as const,
                description: 'Routine 20,000 km "A" Service Inspection: dynamic caliper cleaning, secondary suspensions visual check, and driver console diagnostic logging.',
                technician: 'T. S. Paul'
            });
        }

        // If health is below 95, add a corrective log
        if (coach.health < 95) {
            records.push({
                id: `REC-CORR-${coach.id}`,
                date: '2026-05-14',
                type: 'Corrective' as const,
                description: `Corrective repair completed: replaced worn out door guide shoe and reset telemetry sensor lines to resolve minor health drop.`,
                technician: 'A. K. George'
            });
        }

        // Always add a routine cleaning log
        records.push({
            id: `REC-CLEAN-${coach.id}`,
            date: '2026-05-18',
            type: 'Cleaning' as const,
            description: 'Depot Deep Clean: internal passenger cabin sanitization, external shell wash, and pantograph contact clean.',
            technician: 'CleanOps Team'
        });

        // Sort descending by date
        return records.sort((a, b) => b.date.localeCompare(a.date));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const modifyTrainsetInService = (trainId: string) => {
        setEditingTrainsetId(trainId);
        const f = fleet.find(t => t.id === trainId);
        if (f) {
            setFormData({
                trainsetId: f.id,
                description: 'Modifying existing unit.',
                mileageKm: f.mileage,
                selectedCoaches: f.coaches
            });
        }
    };

    const toggleCoachSelection = (coachId: string) => {
        setFormData(prev => {
            const isSelected = prev.selectedCoaches.includes(coachId);
            let updatedList: string[];

            if (isSelected) {
                updatedList = prev.selectedCoaches.filter(i => i !== coachId);
            } else {
                if (prev.selectedCoaches.length >= 3) return prev;
                
                const coach = coaches.find(c => c.id === coachId);
                const currentDMCs = prev.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'DMC').length;
                const currentTCs = prev.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'TC').length;
                
                if (coach?.type === 'DMC' && currentDMCs >= 2) {
                    setError("Exactly two DMC units are allowed per trainset.");
                    return prev;
                }
                if (coach?.type === 'TC' && currentTCs >= 1) {
                    setError("Exactly one TC unit is allowed per trainset.");
                    return prev;
                }
                
                setError(null);
                updatedList = [...prev.selectedCoaches, coachId];
            }

            const driving = updatedList.filter(id => coaches.find(c => c.id === id)?.type === 'DMC');
            const trailers = updatedList.filter(id => coaches.find(c => c.id === id)?.type === 'TC');
            
            const result = [];
            if (driving.length > 0) result.push(driving[0]);
            result.push(...trailers);
            if (driving.length > 1) result.push(driving[1]);
            
            return { ...prev, selectedCoaches: result };
        });
    };

    const autoAssignEngines = () => {
        setFormData(prev => {
            const currentDMCs = prev.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'DMC');
            const currentTCs = prev.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'TC');
            const dmcsToFind = 2 - currentDMCs.length;
            const tcsToFind = 1 - currentTCs.length;
            
            if (dmcsToFind <= 0 && tcsToFind <= 0) return prev;

            const bestStandbyDMCs = coaches
                .filter(c => c.type === 'DMC' && c.status === 'Standby' && !prev.selectedCoaches.includes(c.id))
                .sort((a, b) => b.health - a.health)
                .slice(0, dmcsToFind)
                .map(e => e.id);

            const bestStandbyTCs = coaches
                .filter(c => c.type === 'TC' && c.status === 'Standby' && !prev.selectedCoaches.includes(c.id))
                .sort((a, b) => b.health - a.health)
                .slice(0, tcsToFind)
                .map(e => e.id);

            if (bestStandbyDMCs.length < dmcsToFind || bestStandbyTCs.length < tcsToFind) {
                setError("Not enough suitable standby DMC/TC units available.");
                return prev;
            }

            const newSet = [...prev.selectedCoaches, ...bestStandbyDMCs, ...bestStandbyTCs];
            
            const driving = newSet.filter(id => coaches.find(c => c.id === id)?.type === 'DMC');
            const trailers = newSet.filter(id => coaches.find(c => c.id === id)?.type === 'TC');
            const result = [];
            if (driving.length > 0) result.push(driving[0]);
            result.push(...trailers);
            if (driving.length > 1) result.push(driving[1]);

            setError(null);
            return { ...prev, selectedCoaches: result };
        });
    };

    const generateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const selectedDetails = formData.selectedCoaches.map(id => coaches.find(c => c.id === id));
        const dmcs = selectedDetails.filter(c => c?.type === 'DMC');
        
        if (formData.selectedCoaches.length !== 3) {
            setError("Exactly 3 coaches are required for a valid trainset (2 DMCs, 1 TC).");
            return;
        }

        if (dmcs.length !== 2) {
            setError("Trainset must have exactly two DMC units.");
            return;
        }

        if (selectedDetails[0]?.type !== 'DMC' || selectedDetails[selectedDetails.length - 1]?.type !== 'DMC') {
            setError("DMC units must be at the starting and ending positions of the trainset (DMC-TC-DMC).");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const data = await analyzeInductionReadiness(formData, coaches);
            setReport(data);
            setHistory(prev => [data, ...prev].slice(0, 10));
        } catch (err: any) {
            setError(err.message || "Failed to generate induction report.");
        } finally {
            setLoading(false);
        }
    };

    const requestRecall = async () => {
        if (!editingTrainsetId) return;
        try {
            setLoading(true);
            const { error } = await supabase.from('fleet_units')
                .update({ recall_requested: true })
                .eq('id', editingTrainsetId);
            if (error) throw error;
            
            setFleet(prev => prev.map(f => f.id === editingTrainsetId ? { ...f, recallRequested: true } : f));
            alert('Recall request submitted to Supervisor successfully.');
        } catch (err: any) {
            console.error("Error requesting recall:", err);
            setError("Failed to submit recall request: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const scheduleMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        const { coachId, type, durationHours, bayId } = maintScheduleData;
        if (!coachId || !bayId) return;

        const startTime = new Date();
        const isCleaning = type === 'Cleaning';
        
        const newSlot = {
            queue_number: (isCleaning ? cleaningQueue : maintenanceQueue).length + 1,
            type: isCleaning ? 'Cleaning' : 'Maintenance',
            train_id: coachId,
            time: `${durationHours}h`,
            status: 'In Progress',
            is_slot_available: false,
            start_time: startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            bay_id: bayId
        };

        try {
            // 1. Insert into maintenance_slots
            const { error: slotErr } = await supabase.from('maintenance_slots').insert(newSlot);
            if (slotErr) throw slotErr;

            // 2. Update bay status
            const { error: bayErr } = await supabase.from('bays')
                .update({ status: 'Occupied', current_task: coachId })
                .eq('id', bayId);
            if (bayErr) throw bayErr;

            // 3. Update coach status
            const { error: coachErr } = await supabase.from('coaches')
                .update({ status: isCleaning ? 'Cleaning' : 'Maintenance' })
                .eq('id', coachId);
            if (coachErr) throw coachErr;

            // 4. Update fleet status (if it exists as a fleet unit)
            const { error: fleetErr } = await supabase.from('fleet_units')
                .update({ status: isCleaning ? 'Cleaning' : 'Maintenance' })
                .eq('id', coachId);
            // Ignored fleetErr here because a coach might not be a full fleet unit.

            // Optimistic UI updates
            const uiSlot = {
                ...newSlot, queueNumber: newSlot.queue_number, trainId: newSlot.train_id,
                isSlotAvailable: newSlot.is_slot_available, startTime: newSlot.start_time, bayId: newSlot.bay_id
            };
            if (isCleaning) {
                setCleaningQueue(prev => [...prev, uiSlot as any]);
                setCleaningBays(prev => prev.map(b => b.id === bayId ? { ...b, status: 'Occupied', currentTask: coachId } : b));
            } else {
                setMaintenanceQueue(prev => [...prev, uiSlot as any]);
                setMaintenanceBays(prev => prev.map(b => b.id === bayId ? { ...b, status: 'Occupied', currentTask: coachId } : b));
            }

            setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, status: isCleaning ? 'Cleaning' : 'Maintenance' } : c));
            setFleet(prev => prev.map(f => f.id === coachId ? { ...f, status: isCleaning ? 'Cleaning' : 'Maintenance' } : f));
            setMaintScheduleData(p => ({ ...p, coachId: '', bayId: '' }));
            alert('Service slot successfully booked and database updated.');
        } catch (err: any) {
            console.error("Error scheduling maintenance:", err);
            setError("Failed to sync schedule with database: " + err.message);
        }
    };

    const approveInduction = async () => {
        if (!report) return;
        const newScheduleId = `SCH_${Math.floor(Math.random()*1000)}`;
        const isEditing = !!editingTrainsetId;

        try {
            if (isEditing) {
                // UPDATE EXISTING -> Keep as Standby until Supervisor approves
                const { error: fleetErr } = await supabase.from('fleet_units')
                    .update({ 
                        status: 'Standby', 
                        mileage: formData.mileageKm, 
                        health: Math.floor(report.Readiness_Score * 3.3), 
                        coaches: formData.selectedCoaches 
                    })
                    .eq('id', editingTrainsetId);
                if (fleetErr) throw fleetErr;

                // Check if schedule item already exists
                const { data: existingSched } = await supabase.from('schedule_items')
                    .select('id')
                    .eq('train_id', editingTrainsetId)
                    .maybeSingle();

                let schedErr;
                if (existingSched) {
                    const { error } = await supabase.from('schedule_items')
                        .update({
                            time: '08:00',
                            route: 'Internal Depot Move',
                            status: 'Pending Start',
                            control_status: 'Pending'
                        })
                        .eq('train_id', editingTrainsetId);
                    schedErr = error;
                } else {
                    const { error } = await supabase.from('schedule_items').insert({
                        id: newScheduleId,
                        train_id: editingTrainsetId,
                        time: '08:00',
                        route: 'Internal Depot Move',
                        status: 'Pending Start',
                        control_status: 'Pending'
                    });
                    schedErr = error;
                }
                if (schedErr) throw schedErr;

                // Sync coaches
                const oldCoaches = fleet.find(f => f.id === editingTrainsetId)?.coaches || [];
                const newCoaches = formData.selectedCoaches;
                
                for (const c of newCoaches) {
                    await supabase.from('coaches').update({ status: 'Active' }).eq('id', c);
                }
                for (const c of oldCoaches) {
                    if (!newCoaches.includes(c)) {
                        await supabase.from('coaches').update({ status: 'Standby' }).eq('id', c);
                    }
                }

                // Optimistic UI updates
                setFleet(prev => prev.map(f => f.id === editingTrainsetId ? { 
                    ...f, status: 'Standby', mileage: formData.mileageKm, health: report.Readiness_Score * 3.3, coaches: formData.selectedCoaches
                } : f));

                if (existingSched) {
                    setSchedule(prev => prev.map(s => s.trainId === editingTrainsetId ? { 
                        ...s, 
                        status: 'Pending Start', 
                        controlStatus: 'Pending',
                        time: '08:00',
                        route: 'Internal Depot Move'
                    } : s));
                } else {
                    setSchedule(prev => [...prev, { 
                        id: newScheduleId, 
                        trainId: editingTrainsetId, 
                        time: '08:00', 
                        route: 'Internal Depot Move', 
                        status: 'Pending Start', 
                        controlStatus: 'Pending' 
                    }]);
                }
                
                setCoaches(prev => prev.map(c => {
                    if (newCoaches.includes(c.id)) return { ...c, status: 'Active' };
                    if (oldCoaches.includes(c.id) && !newCoaches.includes(c.id)) return { ...c, status: 'Standby' };
                    return c;
                }));
            } else {
                // NEW PLAN -> UPDATE existing standby fleet unit
                const { error: fleetErr } = await supabase.from('fleet_units')
                    .update({
                        status: 'Standby', // Stay standby until Supervisor approves
                        mileage: formData.mileageKm,
                        health: Math.floor(report.Readiness_Score * 3.3),
                        coaches: formData.selectedCoaches,
                        route: 'Unassigned',
                        start_time: 'N/A',
                        maintenance_required: false,
                        cleaning_required: false,
                        fc_valid: true,
                        job_card: 'Closed'
                    })
                    .eq('id', report.Trainset_ID);
                if (fleetErr) throw fleetErr;

                // Check if schedule item already exists
                const { data: existingSched } = await supabase.from('schedule_items')
                    .select('id')
                    .eq('train_id', report.Trainset_ID)
                    .maybeSingle();

                let schedErr;
                if (existingSched) {
                    const { error } = await supabase.from('schedule_items')
                        .update({
                            time: '08:00',
                            route: 'Internal Depot Move',
                            status: 'Pending Start',
                            control_status: 'Pending'
                        })
                        .eq('train_id', report.Trainset_ID);
                    schedErr = error;
                } else {
                    const { error } = await supabase.from('schedule_items').insert({
                        id: newScheduleId,
                        train_id: report.Trainset_ID,
                        time: '08:00',
                        route: 'Internal Depot Move',
                        status: 'Pending Start',
                        control_status: 'Pending'
                    });
                    schedErr = error;
                }
                if (schedErr) throw schedErr;

                for (const c of formData.selectedCoaches) {
                    await supabase.from('coaches').update({ status: 'Active' }).eq('id', c);
                }

                // Optimistic UI updates
                if (existingSched) {
                    setSchedule(prev => prev.map(s => s.trainId === report.Trainset_ID ? { 
                        ...s, 
                        status: 'Pending Start', 
                        controlStatus: 'Pending',
                        time: '08:00',
                        route: 'Internal Depot Move'
                    } : s));
                } else {
                    setSchedule(prev => [...prev, { id: newScheduleId, trainId: report.Trainset_ID, time: '08:00', route: 'Internal Depot Move', status: 'Pending Start', controlStatus: 'Pending' }]);
                }

                setFleet(prev => prev.map(f => f.id === report.Trainset_ID ? { 
                    ...f, status: 'Standby', mileage: formData.mileageKm, fc_valid: true, job_card: 'Closed', health: report.Readiness_Score * 3.3,
                    coaches: formData.selectedCoaches, route: 'Unassigned', startTime: 'N/A', maintenanceRequired: false, cleaningRequired: false
                } : f));

                setCoaches(prev => prev.map(c => formData.selectedCoaches.includes(c.id) ? { ...c, status: 'Active' } : c));
            }

            setReport(null);
            setEditingTrainsetId(null);
            setFormData(p => ({...p, trainsetId: `KM${Math.floor(Math.random()*25+1).toString().padStart(2, '0')}`, selectedCoaches: []}));
            alert('Plan successfully submitted to Supervisor and synced to database!');
        } catch (err: any) {
            console.error("Error approving induction:", err);
            setError("Failed to sync induction approval with database: " + err.message);
        }
    };
    const filteredCoaches = coaches.filter(c => {
        if (coachSearch && !c.id.toLowerCase().includes(coachSearch.toLowerCase())) {
            return false;
        }
        if (coachTypeFilter !== 'All' && c.type !== coachTypeFilter) {
            return false;
        }
        if (coachFilter !== 'All' && c.status !== coachFilter) {
            return false;
        }
        return true;
    });

    const activeEditingTrainset = editingTrainsetId ? fleet.find(f => f.id === editingTrainsetId) : null;
    const isLocked = activeEditingTrainset && (activeEditingTrainset.status === 'In Service' || activeEditingTrainset.status === 'Maintenance');

    const renderCoachRow = (c: CoachInstance) => {
        const isSelected = formData.selectedCoaches.includes(c.id);
        const isOriginal = editingTrainsetId && fleet.find(f => f.id === editingTrainsetId)?.coaches.includes(c.id);
        const isFit = c.health > 90 && (c.status === 'Standby' || isOriginal);

        return (
            <motion.div
                key={c.id}
                whileHover={{ backgroundColor: "rgba(241, 245, 249, 0.5)" }}
                className={cn(
                    "flex items-center justify-between p-3 border-b border-slate-100 transition-all cursor-pointer",
                    isSelected ? "bg-metro-blue/5 border-l-4 border-l-metro-blue pl-2" : "bg-white hover:bg-slate-50",
                    isLocked ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
                )}
                onClick={() => !isLocked && toggleCoachSelection(c.id)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                        isSelected ? "bg-metro-blue border-metro-blue text-white" : "border-slate-300"
                    )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm tracking-wide">{c.id}</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 font-bold rounded",
                                c.type === 'Driving' ? "bg-orange-100 text-metro-orange" : "bg-blue-100 text-metro-blue"
                            )}>
                                {c.type === 'Driving' ? 'Driving Engine' : 'Trailer Coach'}
                            </span>
                            {isOriginal && <span className="bg-metro-blue text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">CURRENT</span>}
                            {isFit && !isSelected && !isOriginal && <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">FIT</span>}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className={cn(
                                "font-semibold text-[11px] px-2 py-0.5 rounded-full",
                                c.status === 'Active' ? "bg-green-50 text-green-700 border border-green-200" :
                                c.status === 'Standby' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                c.status === 'Idle' ? "bg-slate-100 text-slate-600 border border-slate-200" :
                                "bg-red-50 text-red-700 border border-red-200"
                            )}>
                                {c.status}
                            </span>
                            <span className="font-bold">Mileage: {c.mileage} KM</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold uppercase">Health</span>
                            <span className={cn("text-xs font-black", c.health > 90 ? "text-green-600" : "text-metro-orange")}>{c.health}%</span>
                        </div>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className={cn("h-full", c.health > 90 ? "bg-green-500" : "bg-metro-orange")} style={{ width: `${c.health}%` }} />
                        </div>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setViewingCoach(c); }}
                        className="text-[11px] text-metro-blue font-bold hover:bg-metro-blue/10 px-2.5 py-1.5 rounded-lg transition-colors border border-metro-blue/20"
                    >
                        Logs
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <>
            <section className="lg:col-span-12 space-y-6">
            {/* Title & Tab Bar Container */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Train className="w-6 h-6 text-metro-blue" /> KMRL Smart Induction Control Center
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Configure coach compositions, perform safety checks via AI reasoning, and direct maintenance workflows.</p>
                </div>
                
                {/* Custom Segmented Controller Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-inner border border-slate-200/50 w-full md:w-auto shrink-0">
                    <button 
                        type="button" 
                        onClick={() => setInductionTab('composition')}
                        className={cn(
                            "flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2",
                            inductionTab === 'composition' 
                                ? "bg-white shadow-sm text-metro-blue ring-1 ring-black/5" 
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Layers className="w-4 h-4" /> Assembly & Composition
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setInductionTab('maintenance')}
                        className={cn(
                            "flex-1 md:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2",
                            inductionTab === 'maintenance' 
                                ? "bg-white shadow-sm text-metro-blue ring-1 ring-black/5" 
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Wrench className="w-4 h-4" /> Service Planner
                    </button>
                </div>
            </div>

            {/* Quick Yard Stat Badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Standby Inventory</p>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">
                            {coaches.filter(c => c.status === 'Standby').length} <span className="text-xs font-bold text-slate-400">Coaches</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-metro-blue/10 flex items-center justify-center text-metro-blue shrink-0">
                        <Train className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Fleet</p>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">
                            {fleet.filter(f => f.status === 'In Service').length} <span className="text-xs font-bold text-slate-400">Units</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-metro-orange shrink-0">
                        <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Maintenance Bays</p>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">
                            {maintenanceBays.filter(b => b.status === 'Occupied').length}/{maintenanceBays.length} <span className="text-xs font-bold text-slate-400">Slots</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cleaning Bays</p>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">
                            {cleaningBays.filter(b => b.status === 'Occupied').length}/{cleaningBays.length} <span className="text-xs font-bold text-slate-400">Slots</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Core Tab Workspaces */}
            {inductionTab === 'composition' ? (
                /* 1. ASSEMBLY / INDUCTION CONSOLE */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Planning Parameters Sidebar */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-slate-400" />
                                    {editingTrainsetId ? 'Modify Active Composition' : 'Assembly Parameters'}
                                </h3>
                                
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        type="button"
                                        onClick={() => { if (fleet.length > 0) modifyTrainsetInService(fleet[0].id); }}
                                        className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all duration-200", editingTrainsetId ? "bg-white shadow-sm text-metro-blue" : "text-slate-400 hover:text-slate-600")}
                                    >Modify</button>
                                    <button 
                                        type="button"
                                        onClick={() => { setEditingTrainsetId(null); setFormData(p => ({...p, trainsetId: `KM${Math.floor(Math.random()*25+1).toString().padStart(2, '0')}`, selectedCoaches: []})); }}
                                        className={cn("px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all duration-200", !editingTrainsetId ? "bg-white shadow-sm text-metro-blue" : "text-slate-400 hover:text-slate-600")}
                                    >New</button>
                                </div>
                            </div>

                            <form onSubmit={generateReport} className="space-y-5">
                                {editingTrainsetId ? (
                                    <div className="relative">
                                        <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 block">Target Trainset Unit</label>
                                        <div 
                                            onClick={() => setIsModifySelectOpen(!isModifySelectOpen)}
                                            className="input-field rounded-xl font-bold text-slate-700 bg-white border border-slate-200 shadow-sm cursor-pointer flex justify-between items-center py-2.5 px-4 hover:border-slate-355 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Train className="w-4 h-4 text-slate-400" />
                                                {editingTrainsetId ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-slate-800">{editingTrainsetId}</span>
                                                        <span className={cn(
                                                            "text-[7px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider scale-90",
                                                            fleet.find(t => t.id === editingTrainsetId)?.status === 'In Service' ? "bg-green-50 text-green-700 border border-green-150" : "bg-blue-50 text-metro-blue border border-blue-150"
                                                        )}>
                                                            {fleet.find(t => t.id === editingTrainsetId)?.status === 'In Service' ? 'ACTIVE' : fleet.find(t => t.id === editingTrainsetId)?.status}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold">
                                                            ({fleet.find(t => t.id === editingTrainsetId)?.health.toFixed(0)}% Health)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span>Select Target Trainset...</span>
                                                )}
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isModifySelectOpen && "transform rotate-180")} />
                                        </div>

                                        {isModifySelectOpen && (
                                            <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1.5 duration-200 max-h-[300px] overflow-hidden flex flex-col">
                                                {/* Search Field */}
                                                <div className="relative shrink-0">
                                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                        <Search className="w-3.5 h-3.5" />
                                                    </span>
                                                    <input 
                                                        type="text" 
                                                        value={modifySelectSearch}
                                                        onChange={(e) => setModifySelectSearch(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-metro-blue transition-all"
                                                        placeholder="Search target trainset (e.g. KM02)..."
                                                    />
                                                </div>

                                                {/* Options List */}
                                                <div className="overflow-y-auto flex-1 pr-0.5 space-y-1 max-h-[200px] no-scrollbar">
                                                    {fleet.filter(f => f.id.toLowerCase().includes(modifySelectSearch.toLowerCase())).length === 0 ? (
                                                        <p className="text-[10px] text-slate-400 italic text-center py-3">No matching trainsets found</p>
                                                    ) : (
                                                        fleet.filter(f => f.id.toLowerCase().includes(modifySelectSearch.toLowerCase())).map(f => {
                                                            const isSelected = editingTrainsetId === f.id;
                                                            return (
                                                                <div 
                                                                    key={f.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        modifyTrainsetInService(f.id);
                                                                        setIsModifySelectOpen(false);
                                                                        setModifySelectSearch('');
                                                                    }}
                                                                    className={cn(
                                                                        "p-2.5 rounded-xl text-left cursor-pointer flex justify-between items-center transition-colors text-xs font-bold",
                                                                        isSelected 
                                                                            ? "bg-slate-100 text-metro-blue" 
                                                                            : "hover:bg-slate-50 text-slate-700"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-extrabold text-slate-800">{f.id}</span>
                                                                        <span className={cn(
                                                                            "text-[7px] font-black px-1 rounded uppercase tracking-wider scale-90",
                                                                            f.status === 'In Service' ? "bg-green-50 text-green-700 border border-green-150" :
                                                                            f.status === 'Standby' ? "bg-blue-50 text-metro-blue border border-blue-150" :
                                                                            "bg-amber-50 text-metro-orange border border-amber-150"
                                                                        )}>
                                                                            {f.status === 'In Service' ? 'ACTIVE' : f.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[9px] font-mono text-slate-400">
                                                                            {f.coaches.map(c => c.split('-').pop()).join('-')}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-extrabold">
                                                                            {f.health.toFixed(0)}% Health
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 block">Trainset Descriptor ID</label>
                                        <div 
                                            onClick={() => setIsSelectOpen(!isSelectOpen)}
                                            className="input-field rounded-xl font-bold text-slate-700 bg-white border border-slate-200 shadow-sm cursor-pointer flex justify-between items-center py-2.5 px-4 hover:border-slate-350 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Train className="w-4 h-4 text-slate-400" />
                                                <span>{formData.trainsetId || "Select Trainset Unit..."}</span>
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isSelectOpen && "transform rotate-180")} />
                                        </div>

                                        {isSelectOpen && (
                                            <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1.5 duration-200 max-h-[300px] overflow-hidden flex flex-col">
                                                {/* Search Field */}
                                                <div className="relative shrink-0">
                                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                        <Search className="w-3.5 h-3.5" />
                                                    </span>
                                                    <input 
                                                        type="text" 
                                                        value={selectSearch}
                                                        onChange={(e) => setSelectSearch(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-metro-blue transition-all"
                                                        placeholder="Search trainset ID (e.g. KM01)..."
                                                    />
                                                </div>

                                                {/* Options List */}
                                                <div className="overflow-y-auto flex-1 pr-0.5 space-y-1 max-h-[200px] no-scrollbar">
                                                    {fleet.filter(f => f.id.toLowerCase().includes(selectSearch.toLowerCase())).length === 0 ? (
                                                        <p className="text-[10px] text-slate-400 italic text-center py-3">No matching trainsets found</p>
                                                    ) : (
                                                        fleet.filter(f => f.id.toLowerCase().includes(selectSearch.toLowerCase())).map(f => {
                                                            const isSelected = formData.trainsetId === f.id;
                                                            return (
                                                                <div 
                                                                    key={f.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData({
                                                                            trainsetId: f.id,
                                                                            description: 'Routine scheduled induction request.',
                                                                            mileageKm: f.mileage,
                                                                            selectedCoaches: f.coaches
                                                                        });
                                                                        setIsSelectOpen(false);
                                                                        setSelectSearch('');
                                                                        if (f.status === 'In Service') {
                                                                            modifyTrainsetInService(f.id);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "p-2.5 rounded-xl text-left cursor-pointer flex justify-between items-center transition-colors text-xs font-bold",
                                                                        isSelected 
                                                                            ? "bg-slate-100 text-metro-blue" 
                                                                            : "hover:bg-slate-50 text-slate-700"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-extrabold text-slate-800">{f.id}</span>
                                                                        <span className={cn(
                                                                            "text-[7px] font-black px-1 rounded uppercase tracking-wider scale-90",
                                                                            f.status === 'In Service' ? "bg-green-50 text-green-700 border border-green-150" :
                                                                            f.status === 'Standby' ? "bg-blue-50 text-metro-blue border border-blue-150" :
                                                                            "bg-amber-50 text-metro-orange border border-amber-150"
                                                                        )}>
                                                                            {f.status === 'In Service' ? 'ACTIVE' : f.status}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-extrabold">
                                                                        {f.health.toFixed(0)}% Health
                                                                    </span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Operational Mission Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="input-field min-h-[80px] text-xs resize-none rounded-xl bg-slate-50/50" />
                                </div>

                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Accumulated Coach Mileage (KM)</label>
                                    <input type="number" name="mileageKm" value={formData.mileageKm} disabled className="input-field rounded-xl bg-slate-100 border-slate-200 text-slate-500 font-mono font-bold cursor-not-allowed" />
                                </div>

                                {/* Trainset Assembly Visualization Block */}
                                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 shadow-inner">
                                    <label className="input-label flex justify-between items-center mb-3">
                                        <span className="font-bold text-xs text-slate-500 uppercase tracking-wider">Composition Assembly Visualizer</span>
                                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md", formData.selectedCoaches.length === 3 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                                            {formData.selectedCoaches.length}/3 Assembled
                                        </span>
                                    </label>
                                    
                                    <div className="flex items-center gap-1.5 p-4 bg-slate-900 rounded-xl overflow-x-auto min-h-[70px] shadow-lg border border-slate-800">
                                        {formData.selectedCoaches.length === 0 && <span className="text-slate-500 text-[11px] italic mx-auto">No coaches selected. Use the roster list to insert units...</span>}
                                        {formData.selectedCoaches.map((cId, idx) => {
                                            const coach = coaches.find(c => c.id === cId);
                                            return (
                                                <div key={cId} className="relative shrink-0 group">
                                                    <div className={cn(
                                                        "w-14 h-9 border-2 flex flex-col items-center justify-center text-[9px] font-black tracking-wider transition-all duration-200 shadow-md",
                                                        coach?.type === 'Driving' 
                                                            ? "bg-metro-blue border-metro-blue text-white rounded-lg" 
                                                            : "bg-slate-700 border-slate-600 text-slate-300 rounded-md"
                                                    )}>
                                                        <span>{coach?.id}</span>
                                                        <span className="text-[6px] font-bold tracking-tight text-white/70">
                                                            {coach?.type === 'Driving' ? 'ENGINE' : 'TRAILER'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {formData.selectedCoaches.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Avg Health</p>
                                                <p className="font-black text-slate-800 text-sm mt-0.5">
                                                    {(formData.selectedCoaches.reduce((acc, id) => acc + (coaches.find(c => c.id === id)?.health || 0), 0) / formData.selectedCoaches.length).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Format</p>
                                                <p className="font-black text-slate-800 text-sm mt-0.5">
                                                    {formData.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'Driving').length}E + {formData.selectedCoaches.filter(id => coaches.find(c => c.id === id)?.type === 'Trailer').length}C
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isLocked ? (
                                    activeEditingTrainset?.recallRequested ? (
                                        <div className="w-full py-3 rounded-xl text-xs font-bold uppercase shadow-sm bg-orange-100 text-orange-700 text-center border border-orange-200">
                                            Recall Request Pending Supervisor Approval
                                        </div>
                                    ) : (
                                        <button 
                                            type="button"
                                            disabled={loading} 
                                            onClick={requestRecall}
                                            className="w-full py-3 rounded-xl text-xs font-bold uppercase shadow-md transition-transform hover:-translate-y-0.5 bg-red-600 text-white hover:bg-red-700 border border-red-700"
                                        >
                                            {loading ? "Requesting..." : "Request Formal Recall to Depot"}
                                        </button>
                                    )
                                ) : (
                                    <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl text-xs font-bold uppercase shadow-md transition-transform hover:-translate-y-0.5">
                                        {loading ? "Performing AI Diagnostics..." : "Generate AI Readiness Report"}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Right: Roster & AI Report Split */}
                    <div className="lg:col-span-7 space-y-6">
                        {report ? (
                            /* DISPLAY AI COGNITIVE REPORT RIGHT BESIDE INPUTS */
                            <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-start pb-5 border-b border-slate-100 mb-5">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Diagnosis Analysis Engine</span>
                                        <h3 className="text-lg font-display font-bold text-slate-900">AI Readiness Report: {report.Trainset_ID}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500">Readiness Evaluation Score:</span>
                                            <span className={cn(
                                                "text-xs font-black px-2 py-0.5 rounded",
                                                report.Readiness_Score >= 24 ? "bg-green-50 text-green-700" :
                                                report.Readiness_Score >= 18 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                                            )}>{report.Readiness_Score}/30</span>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold uppercase border shadow-sm",
                                        report.Induction_Decision === 'Immediate SERVICE' || report.Induction_Decision.includes('SERVICE')
                                            ? 'bg-red-50 border-red-100 text-red-600 animate-pulse' 
                                            : 'bg-green-50 border-green-100 text-green-700'
                                    )}>
                                        {report.Induction_Decision}
                                    </span>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs leading-relaxed text-slate-700 mb-6 shadow-inner">
                                    <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-[10px] flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-metro-blue" /> Strategic Planning Summary</h4>
                                    <p className="font-medium text-slate-600">{report.Strategic_Summary}</p>
                                </div>
                                
                                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-[10px] tracking-widest">Yard Grading Parameters</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                    {Object.entries(report.Grades).map(([key, value]) => (
                                        <div key={key} className="bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{key}</p>
                                            <div className="flex items-baseline justify-between mt-1">
                                                <span className="text-base font-extrabold text-slate-800">{value as number}/5</span>
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (value as number) >= 4 ? '#28a745' : (value as number) >= 3 ? '#f37721' : '#dc3545' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setReport(null)} 
                                        className="px-5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs border border-slate-200 transition-colors"
                                    >
                                        Re-evaluate Composition
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={approveInduction} 
                                        className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold"
                                    >
                                        Approve & Submit Plan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ROSTER YARD LIST SELECTION */
                            <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="input-label mb-0 text-slate-800 text-sm font-bold flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-metro-blue" /> Depot Roster & Selection
                                        </label>
                                        <p className="text-[11px] text-slate-400">Search and check checkboxes of active/standby units to assemble the trainset.</p>
                                    </div>
                                    
                                    {/* Filters Controls Pane */}
                                    <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Search unit ID (e.g. E-101)..." 
                                                value={coachSearch} 
                                                onChange={(e) => setCoachSearch(e.target.value)} 
                                                className="input-field py-1.5 pl-3 text-xs bg-white border-slate-200 rounded-lg"
                                            />
                                            {coachSearch && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setCoachSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 shrink-0">Status:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(['All', 'Active', 'Standby', 'Idle'] as const).map(status => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            onClick={() => setCoachFilter(status)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all duration-150",
                                                                coachFilter === status 
                                                                    ? "bg-metro-blue text-white shadow-sm ring-1 ring-black/5" 
                                                                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                                                            )}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12 shrink-0">Type:</span>
                                                <div className="flex gap-1">
                                                    {(['All', 'DMC', 'TC'] as const).map(type => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setCoachTypeFilter(type)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all duration-150",
                                                                coachTypeFilter === type 
                                                                    ? "bg-metro-blue text-white shadow-sm ring-1 ring-black/5" 
                                                                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                                                            )}
                                                        >
                                                            {type === 'All' ? 'All' : type === 'DMC' ? 'DMC' : 'TC'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coaches Scrollable Roster Table */}
                                    <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto no-scrollbar bg-white shadow-sm">
                                        {filteredCoaches.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 italic text-xs">
                                                No coaches match the specified criteria.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {filteredCoaches.map(renderCoachRow)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">
                                        <span>Composition: {formData.selectedCoaches.length}/3 UNITS SELECTED</span>
                                        {formData.selectedCoaches.length > 0 && <button type="button" onClick={() => setFormData(p => ({...p, selectedCoaches: []}))} className="text-metro-orange hover:underline font-extrabold">Clear Selected</button>}
                                    </div>

                                    <div className="flex gap-2">
                                        <button type="button" onClick={autoAssignEngines} className="flex-1 py-2 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                            <Zap className="w-3.5 h-3.5 text-metro-orange" /> Precision Auto-Assign
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* 2. SERVICE PLANNER WORKSPACE (CONSOLIDATED IN DUAL PANEL SIDE-BY-SIDE!) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Panel: Scheduling Booking Form */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in fade-in duration-350">
                            <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                                <Calendar className="w-5 h-5 text-slate-400" /> Book Yard Slot & Schedule
                            </h3>
                            
                            <form onSubmit={scheduleMaintenance} className="space-y-5">
                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                                        <span>1. Select Target Unit from Yard</span>
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-400">Click to Select</span>
                                    </label>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto no-scrollbar bg-white shadow-inner">
                                        {coaches.length === 0 && <div className="p-4 text-center text-xs text-slate-400">No coaches available.</div>}
                                        {coaches.map(c => {
                                            const isSelected = maintScheduleData.coachId === c.id;
                                            const needsACheck = c.mileage >= 4500 && c.mileage < 15000;
                                            const needsBCheck = c.mileage >= 14500;
                                            
                                            return (
                                                <div 
                                                    key={c.id}
                                                    onClick={() => setMaintScheduleData(p => ({ ...p, coachId: c.id, type: needsBCheck ? 'B-Check' : needsACheck ? 'A-Check' : p.type }))}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50",
                                                        isSelected ? "bg-metro-blue/5 border-l-4 border-l-metro-blue pl-2" : "bg-white",
                                                        c.status === 'Maintenance' || c.status === 'Cleaning' ? "opacity-50 pointer-events-none grayscale" : ""
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                            isSelected ? "border-4 border-metro-blue" : "border-slate-300"
                                                        )} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-slate-800">{c.id}</span>
                                                                <span className={cn(
                                                                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                                    c.status === 'Active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                                                                )}>{c.status}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400">{c.type} Coach</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 justify-end">
                                                            {needsBCheck && <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded shadow-sm animate-pulse">B-CHECK DUE</span>}
                                                            {!needsBCheck && needsACheck && <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shadow-sm">A-CHECK DUE</span>}
                                                            <span className="font-black text-slate-700 text-xs">{c.mileage} KM</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">2. Service Classification & Routine</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'A-Check', label: 'A-Check (~5k km)', desc: 'Targeted inspection: bogies, AC, train-control' },
                                            { id: 'B-Check', label: 'B-Check (15k+ km)', desc: 'In-depth mechanical/electrical checks' },
                                            { id: 'Corrective Repair', label: 'Corrective Repair', desc: 'Unscheduled fault resolution' },
                                            { id: 'Cleaning', label: 'Deep Cleaning', desc: 'Standard sanitation block' }
                                        ].map((service) => (
                                            <button 
                                                key={service.id}
                                                type="button"
                                                onClick={() => setMaintScheduleData(p => ({ ...p, type: service.id as any, bayId: '' }))}
                                                className={cn(
                                                    "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all duration-200",
                                                    maintScheduleData.type === service.id 
                                                        ? "bg-metro-blue/10 border-metro-blue shadow-sm ring-1 ring-black/5" 
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                                                )}
                                            >
                                                <span className={cn("text-xs font-black", maintScheduleData.type === service.id ? "text-metro-blue" : "text-slate-700")}>{service.label}</span>
                                                <span className={cn("text-[9px] font-medium leading-tight", maintScheduleData.type === service.id ? "text-metro-blue/80" : "text-slate-400")}>{service.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">3. Expected Duration (Hours)</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="72"
                                        className="input-field rounded-xl font-bold text-slate-700 w-full" 
                                        value={maintScheduleData.durationHours} 
                                        onChange={(e) => setMaintScheduleData(p => ({ ...p, durationHours: Number(e.target.value) }))} 
                                    />
                                </div>

                                <div>
                                    <label className="input-label font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">4. Assign Operational Bay</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(maintScheduleData.type === 'Cleaning' ? cleaningBays : maintenanceBays).map(bay => (
                                            <button
                                                key={bay.id} 
                                                type="button" 
                                                disabled={bay.status === 'Occupied' || !bay.functional}
                                                onClick={() => setMaintScheduleData(p => ({...p, bayId: bay.id}))}
                                                className={cn(
                                                    "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all duration-200",
                                                    !bay.functional ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed" :
                                                    bay.status === 'Occupied' ? "bg-red-50 border-red-100 cursor-not-allowed" :
                                                    maintScheduleData.bayId === bay.id ? "bg-metro-blue/10 border-metro-blue shadow-sm" : "bg-white border-slate-200 hover:border-metro-blue"
                                                )}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-extrabold text-slate-800 text-xs">{bay.id}</span>
                                                    <span className={cn(
                                                        "text-[8px] font-bold px-1.5 py-0.5 rounded",
                                                        bay.status === 'Available' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    )}>{bay.status}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-400 leading-tight">
                                                    {bay.status === 'Occupied' ? `Executing: ${bay.currentTask}` : 'Awaiting Booking'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" disabled={!maintScheduleData.coachId || !maintScheduleData.bayId} className="btn-primary w-full py-3 mt-4 rounded-xl text-xs font-bold uppercase shadow-md transition-transform hover:-translate-y-0.5">
                                    Book Bay Slot & Confirm Schedule
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Panel: Yard & Bays Grid Overview */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Live Activity Matrix */}
                        <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in fade-in duration-350">
                            <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2 mb-5">
                                <Activity className="w-5 h-5 text-slate-400" /> Yard Bays Live Activity Grid
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Maintenance Bays */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                                        <span>Maintenance Bays</span>
                                        <span className="bg-metro-orange/10 text-metro-orange px-2 py-0.5 rounded text-[9px] font-black">SLA: 2h</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {maintenanceBays.map(bay => (
                                            <div key={bay.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="font-bold text-xs text-slate-800">{bay.id}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {bay.status === 'Occupied' ? `Executing: ${bay.currentTask}` : 'Ready for bookings'}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-sm",
                                                    bay.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-metro-orange'
                                                )}>
                                                    {bay.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cleaning Bays */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200 flex items-center justify-between">
                                        <span>Cleaning Bays</span>
                                        <span className="bg-metro-blue/10 text-metro-blue px-2 py-0.5 rounded text-[9px] font-black">SLA: 2h</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {cleaningBays.map(bay => (
                                            <div key={bay.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                                <div>
                                                    <span className="font-bold text-xs text-slate-800">{bay.id}</span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {bay.status === 'Occupied' ? `Washing: ${bay.currentTask}` : 'Ready for bookings'}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-sm",
                                                    bay.status === 'Available' ? 'bg-green-100 text-green-700' : 
                                                    bay.status === 'Maintenance' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-metro-blue'
                                                )}>
                                                    {bay.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Service Queue status */}
                        <div className="dashboard-card p-6 bg-white border border-slate-200 shadow-sm rounded-2xl animate-in fade-in duration-350">
                            <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2 mb-5">
                                <Clock className="w-5 h-5 text-slate-400" /> Yards Scheduled Operational Queue
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Maintenance Queue */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-metro-orange" /> Maintenance Queue
                                    </h4>
                                    <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                                        {maintenanceQueue.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">No items currently queued.</p>
                                        ) : (
                                            maintenanceQueue.map((item, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-sm">
                                                    <div>
                                                        <span className="font-bold text-slate-800">{item.trainId}</span>
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">Time Stamp Limit: {item.time}</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-orange-100 text-metro-orange shadow-sm">
                                                        {item.status}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Cleaning Queue */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-metro-blue" /> Cleaning Queue
                                    </h4>
                                    <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                                        {cleaningQueue.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-2">No wash tasks queued.</p>
                                        ) : (
                                            cleaningQueue.map((item, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs shadow-sm">
                                                    <div>
                                                        <span className="font-bold text-slate-800">{item.trainId}</span>
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">Time Stamp Limit: {item.time}</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-blue-100 text-metro-blue shadow-sm">
                                                        {item.status}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </motion.div>
            )}
        </section>

            <AnimatePresence>
                {viewingCoach && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                                "bg-white rounded-2xl shadow-xl w-full overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300",
                                modalTab === 'fleet' ? "max-w-4xl" : "max-w-xl"
                            )}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-display font-bold text-xl flex items-center gap-2">
                                            <ClipboardList className="w-5 h-5 text-metro-blue" />
                                            {modalTab === 'single' ? `${viewingCoach.id} Diagnostic Dossier` : "Fleet-wide Maintenance Timing & Date Report"}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {modalTab === 'single' 
                                                ? `Status: ${viewingCoach.status} | Type: ${viewingCoach.type === 'Driving' ? 'DMC' : 'TC'} | Health: ${viewingCoach.health}%`
                                                : "Real-time projection and scheduling forecast for all 75 active coaches"
                                            }
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => { setViewingCoach(null); setModalTab('single'); }}
                                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
                                    <button 
                                        type="button"
                                        onClick={() => setModalTab('single')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-200", 
                                            modalTab === 'single' ? "bg-white shadow-sm text-metro-blue" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Coach {viewingCoach.id} History
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setModalTab('fleet')}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-200", 
                                            modalTab === 'fleet' ? "bg-white shadow-sm text-metro-blue" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        Fleet Timing Report
                                    </button>
                                </div>
                            </div>
                            
                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {modalTab === 'single' ? (
                                    /* Single Coach History view */
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Mileage</p>
                                                <p className="text-xl font-black text-slate-800 mt-1">{viewingCoach.mileage} KM</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maintenance Status</p>
                                                <span className={cn(
                                                    "inline-block px-2.5 py-1 rounded-full text-xs font-black mt-1",
                                                    viewingCoach.health >= 90 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {viewingCoach.maintenanceStatus || 'Normal'}
                                                </span>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <ClipboardList className="w-4 h-4 text-metro-blue" /> Enriched Previous Maintenance Logs
                                        </h4>
                                        <div className="space-y-4">
                                            {getEnrichedHistory(viewingCoach).map((record: any) => (
                                                <div key={record.id} className="p-4 bg-white rounded-xl border border-slate-150 hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-metro-blue group-hover:bg-metro-orange transition-colors" />
                                                    <div className="flex justify-between items-center mb-2 pl-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-700">{record.date}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">08:00 AM</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
                                                            record.type === 'Periodic' ? "bg-green-100 text-green-700" :
                                                            record.type === 'Corrective' ? "bg-amber-100 text-amber-700" :
                                                            "bg-blue-100 text-metro-blue"
                                                        )}>{record.type}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-700 font-medium pl-2 mb-1.5 leading-relaxed">{record.description}</p>
                                                    <div className="flex justify-between items-center pl-2 pt-2 border-t border-slate-100/50 text-[10px] text-slate-400">
                                                        <span>ID Reference: <span className="font-mono font-bold text-slate-500">{record.id}</span></span>
                                                        <span>Senior Technician: <span className="font-bold text-slate-600">{record.technician}</span></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Fleet-wide Timing Report view */
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="Search coach (e.g. DMC1-01)..." 
                                                    value={fleetReportSearch} 
                                                    onChange={(e) => setFleetReportSearch(e.target.value)} 
                                                    className="input-field py-1.5 pl-3 text-xs bg-white border-slate-200 rounded-lg shadow-sm"
                                                />
                                                {fleetReportSearch && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFleetReportSearch('')}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-slate-600">
                                                <span>Total Coaches: <span className="text-metro-blue text-sm font-black">{coaches.length}</span></span>
                                                <span className="w-px h-4 bg-slate-200" />
                                                <span>Imminent Maintenance: <span className="text-red-600 text-sm font-black">{coaches.filter(c => (5000 - (c.mileage % 5000)) < 500).length}</span></span>
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-[50vh] overflow-y-auto bg-slate-50">
                                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs bg-white">
                                                <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="px-4 py-3">Coach ID</th>
                                                        <th className="px-4 py-3">Type</th>
                                                        <th className="px-4 py-3">Mileage</th>
                                                        <th className="px-4 py-3">Health</th>
                                                        <th className="px-4 py-3">Next A-Check (KMs Left)</th>
                                                        <th className="px-4 py-3">Timing projection (India Standard)</th>
                                                        <th className="px-4 py-3 text-center">Status Priority</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150">
                                                    {coaches
                                                        .filter(c => c.id.toLowerCase().includes(fleetReportSearch.toLowerCase()))
                                                        .map(c => {
                                                            const nextACheck = 5000 - (c.mileage % 5000);
                                                            const daysLeft = Math.max(1, Math.round(nextACheck / 333));
                                                            const dueDate = new Date();
                                                            dueDate.setDate(dueDate.getDate() + daysLeft);
                                                            const formattedDate = dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                                                            let priorityBadge = <span className="px-2 py-0.5 text-[8px] font-black rounded uppercase bg-green-100 text-green-700 border border-green-200 shadow-sm">OPTIMAL</span>;
                                                            if (nextACheck < 500) {
                                                                priorityBadge = <span className="px-2 py-0.5 text-[8px] font-black rounded uppercase bg-red-100 text-red-700 border border-red-200 shadow-sm animate-pulse">IMMINENT</span>;
                                                            } else if (nextACheck < 1500) {
                                                                priorityBadge = <span className="px-2 py-0.5 text-[8px] font-black rounded uppercase bg-amber-100 text-amber-700 border border-amber-200 shadow-sm">DUE SOON</span>;
                                                            }

                                                            return (
                                                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-4 py-3 font-bold text-slate-800">{c.id}</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={cn(
                                                                            "px-1.5 py-0.5 text-[9px] font-bold rounded",
                                                                            c.type === 'Driving' ? "bg-orange-50 text-metro-orange border border-orange-100" : "bg-blue-50 text-metro-blue border border-blue-100"
                                                                        )}>{c.type === 'Driving' ? 'DMC' : 'TC'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono font-medium text-slate-600">{c.mileage} KM</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={cn("font-bold", c.health >= 90 ? "text-green-600" : "text-metro-orange")}>{c.health}%</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{nextACheck} KM left</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-700">{formattedDate}</span>
                                                                            <span className="text-[9px] text-slate-400">Due in ~{daysLeft} operational days</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">{priorityBadge}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kochi Metro Rail Limited Digital Twin</span>
                                <button 
                                    onClick={() => { setViewingCoach(null); setModalTab('single'); }} 
                                    className="px-6 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition-colors text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
