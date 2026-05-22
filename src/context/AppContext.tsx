import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    CoachInstance, 
    FleetUnit, 
    ScheduleItem, 
    MaintenanceSlot, 
    Bay, 
    ReportData,
    AuditLogEntry
} from '../types';
import { supabase } from '../services/supabase';
// Removing local mock data imports
// import { INITIAL_COACHES, ... } from '../data/mockData';

interface AppContextType {
    coaches: CoachInstance[];
    setCoaches: React.Dispatch<React.SetStateAction<CoachInstance[]>>;
    fleet: FleetUnit[];
    setFleet: React.Dispatch<React.SetStateAction<FleetUnit[]>>;
    schedule: ScheduleItem[];
    setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
    maintenanceQueue: MaintenanceSlot[];
    setMaintenanceQueue: React.Dispatch<React.SetStateAction<MaintenanceSlot[]>>;
    cleaningQueue: MaintenanceSlot[];
    setCleaningQueue: React.Dispatch<React.SetStateAction<MaintenanceSlot[]>>;
    maintenanceBays: Bay[];
    setMaintenanceBays: React.Dispatch<React.SetStateAction<Bay[]>>;
    cleaningBays: Bay[];
    setCleaningBays: React.Dispatch<React.SetStateAction<Bay[]>>;
    report: ReportData | null;
    setReport: React.Dispatch<React.SetStateAction<ReportData | null>>;
    history: any[];
    setHistory: React.Dispatch<React.SetStateAction<any[]>>;
    isLoading: boolean;
    error: string | null;
    userRole: 'Planner' | 'Supervisor' | null;
    setUserRole: (role: 'Planner' | 'Supervisor' | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [coaches, setCoaches] = useState<CoachInstance[]>([]);
    const [fleet, setFleet] = useState<FleetUnit[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [maintenanceQueue, setMaintenanceQueue] = useState<MaintenanceSlot[]>([]);
    const [cleaningQueue, setCleaningQueue] = useState<MaintenanceSlot[]>([]);
    const [maintenanceBays, setMaintenanceBays] = useState<Bay[]>([]);
    const [cleaningBays, setCleaningBays] = useState<Bay[]>([]);
    
    const [report, setReport] = useState<ReportData | null>(null);
    const [history, setHistory] = useState<any[]>(() => {
        const stored = localStorage.getItem('kmrl_audit_history');
        return stored ? JSON.parse(stored) : [];
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('kmrl_audit_history', JSON.stringify(history));
    }, [history]);

    const [userRole, setUserRoleState] = useState<'Planner' | 'Supervisor' | null>(() => {
        return localStorage.getItem('kmrl_user_role') as 'Planner' | 'Supervisor' | null;
    });

    const setUserRole = (role: 'Planner' | 'Supervisor' | null) => {
        setUserRoleState(role);
        if (role) {
            localStorage.setItem('kmrl_user_role', role);
        } else {
            localStorage.removeItem('kmrl_user_role');
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setIsLoading(true);
                
                // Fetch all data in parallel
                const [
                    { data: coachesData, error: coachesErr },
                    { data: fleetData, error: fleetErr },
                    { data: scheduleData, error: scheduleErr },
                    { data: slotsData, error: slotsErr },
                    { data: baysData, error: baysErr }
                ] = await Promise.all([
                    supabase.from('coaches').select('*'),
                    supabase.from('fleet_units').select('*'),
                    supabase.from('schedule_items').select('*'),
                    supabase.from('maintenance_slots').select('*'),
                    supabase.from('bays').select('*')
                ]);

                if (coachesErr) throw coachesErr;
                if (fleetErr) throw fleetErr;
                if (scheduleErr) throw scheduleErr;
                if (slotsErr) throw slotsErr;
                if (baysErr) throw baysErr;

                // Transform snake_case from DB back to camelCase for frontend where necessary
                setCoaches((coachesData || []).map(c => ({
                    ...c,
                    maintenanceStatus: c.maintenance_status,
                })));

                setFleet((fleetData || []).map(f => ({
                    ...f,
                    startTime: f.start_time,
                    maintenanceRequired: f.maintenance_required,
                    cleaningRequired: f.cleaning_required,
                    runNumber: f.run_number,
                    recallRequested: f.recall_requested,
                })));

                setSchedule((scheduleData || []).map(s => ({
                    ...s,
                    trainId: s.train_id,
                    controlStatus: s.control_status,
                    runNumber: s.run_number,
                })));

                const slots = slotsData || [];
                setMaintenanceQueue(slots.filter(s => s.type === 'Maintenance').map(s => ({
                    ...s,
                    queueNumber: s.queue_number,
                    trainId: s.train_id,
                    isSlotAvailable: s.is_slot_available,
                    startTime: s.start_time,
                    bayId: s.bay_id,
                })));
                setCleaningQueue(slots.filter(s => s.type === 'Cleaning').map(s => ({
                    ...s,
                    queueNumber: s.queue_number,
                    trainId: s.train_id,
                    isSlotAvailable: s.is_slot_available,
                    startTime: s.start_time,
                    bayId: s.bay_id,
                })));

                const allBays = baysData || [];
                setMaintenanceBays(allBays.filter(b => b.type === 'Maintenance').map(b => ({
                    ...b,
                    currentTask: b.current_task,
                })));
                setCleaningBays(allBays.filter(b => b.type === 'Cleaning').map(b => ({
                    ...b,
                    currentTask: b.current_task,
                })));

                setError(null);
            } catch (err: any) {
                console.error("Error fetching data from Supabase:", err);
                setError(err.message || "Failed to load database");
            } finally {
                setIsLoading(false);
            }
        };

        // Check if environment variables are configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
            setError("Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
            setIsLoading(false);
        } else {
            fetchAllData();
        }

    }, []);

    return (
        <AppContext.Provider value={{
            coaches, setCoaches,
            fleet, setFleet,
            schedule, setSchedule,
            maintenanceQueue, setMaintenanceQueue,
            cleaningQueue, setCleaningQueue,
            maintenanceBays, setMaintenanceBays,
            cleaningBays, setCleaningBays,
            report, setReport,
            history, setHistory,
            isLoading, error,
            userRole, setUserRole
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
