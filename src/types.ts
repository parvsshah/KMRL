export interface MaintenanceRecord {
    id: string;
    date: string;
    description: string;
    technician: string;
    type: 'Periodic' | 'Corrective' | 'Cleaning';
    action?: string;
}

export interface CoachInstance {
    id: string;
    type: 'DMC' | 'TC';
    health: number;
    mileage: number;
    maintenanceStatus: string;
    status: 'Standby' | 'Active' | 'Maintenance' | 'Cleaning' | 'Idle';
    history: MaintenanceRecord[];
}

export interface FleetUnit {
    id: string;
    status: 'In Service' | 'Standby' | 'Maintenance' | 'Cleaning';
    mileage: number;
    health: number;
    coaches: string[];
    route: string | null;
    startTime: string | null;
    maintenanceRequired: boolean;
    cleaningRequired: boolean;
    fc_valid?: boolean;
    job_card?: string;
    branding?: string;
    runNumber?: string;
    recallRequested?: boolean;
}

export interface MaintenanceSlot {
    queueNumber: number;
    type: 'Maintenance' | 'Cleaning';
    trainId: string;
    time: string;
    status: 'Waiting' | 'In Progress' | 'Completed';
    isSlotAvailable: boolean;
    startTime?: string;
    bayId?: string;
}

export interface FormData {
    trainsetId: string;
    description: string;
    mileageKm: number;
    selectedCoaches: string[];
}

export interface ReportData {
    Trainset_ID: string;
    Readiness_Score: number;
    Induction_Decision: string;
    Strategic_Summary: string;
    Grades: {
        Fitness: number;
        JobCard: number;
        Branding: number;
        Mileage: number;
        Cleaning: number;
        Stabling: number;
    };
    Telemetry: {
        Current_Mileage_KM: number;
    };
}

export interface ScheduleItem {
    id: string;
    trainId: string;
    time: string;
    route: string | null;
    status: string;
    controlStatus: string;
    runNumber?: string;
}

export interface Bay {
    id: string;
    status: 'Available' | 'Occupied' | 'Maintenance';
    functional: boolean;
    currentTask: string | null;
}
