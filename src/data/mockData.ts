import { CoachInstance, FleetUnit, ScheduleItem, MaintenanceSlot, Bay } from '../types';

export const ROUTES = [
    "Line 1: Aluva - Petta",
    "Line 1: Aluva - SN Junction",
    "Line 1: Aluva - Tripunithura",
    "Muttom Yard Standby",
    "Muttom Depot Maintenance"
];

export const BRANDING_OPTIONS = [
    "Standard KMRL Theme",
    "Water Metro Integration",
    "Commercial Wrap",
    "Festival Special"
];

export const INITIAL_COACHES: CoachInstance[] = [
    { 
        id: 'E-101', type: 'Driving', health: 98, mileage: 480, maintenanceStatus: 'Normal', status: 'Standby',
        history: [
            { id: 'REC-001', date: '2024-04-20', description: 'Brake pad replacement at Muttom Depot', technician: 'R. Sharma', type: 'Corrective' },
            { id: 'REC-005', date: '2024-05-04', description: 'Deep interior clean', technician: 'CleanOps', type: 'Cleaning' }
        ]
    },
    { 
        id: 'C-102', type: 'Trailer', health: 95, mileage: 520, maintenanceStatus: 'Fit Check Due', status: 'Standby',
        history: [{ id: 'REC-002', date: '2024-04-28', description: 'Periodic Check B', technician: 'A. Varma', type: 'Periodic' }]
    },
    { 
        id: 'C-103', type: 'Trailer', health: 92, mileage: 610, maintenanceStatus: 'Maint. Required', status: 'Standby',
        history: [{ id: 'REC-015', date: '2024-04-15', description: 'Wheel Lathe at Muttom Yard', technician: 'J. Paul', type: 'Periodic' }]
    },
    { 
        id: 'E-104', type: 'Driving', health: 97, mileage: 200, maintenanceStatus: 'Normal', status: 'Standby',
        history: [{ id: 'REC-008', date: '2024-04-01', description: 'Pantograph Check', technician: 'S. Iyer', type: 'Periodic' }]
    },
    { 
        id: 'E-201', type: 'Driving', health: 45, mileage: 840, maintenanceStatus: 'Overdue', status: 'Maintenance',
        history: [{ id: 'REC-010', date: '2024-05-01', description: 'Traction motor overheating', technician: 'S. Iyer', type: 'Corrective' }]
    },
    { 
        id: 'C-202', type: 'Trailer', health: 88, mileage: 300, maintenanceStatus: 'Normal', status: 'Active',
        history: [{ id: 'REC-112', date: '2024-02-10', description: 'Internal Lighting Replacement', technician: 'M. Ali', type: 'Corrective' }]
    },
    { id: 'E-301', type: 'Driving', health: 91, mileage: 150, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    { id: 'C-302', type: 'Trailer', health: 94, mileage: 50, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    { id: 'C-303', type: 'Trailer', health: 89, mileage: 550, maintenanceStatus: 'Cleaning Req', status: 'Standby', history: [] },
    { id: 'E-304', type: 'Driving', health: 93, mileage: 410, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    
    // Additional Mock Data
    { id: 'E-401', type: 'Driving', health: 99, mileage: 120, maintenanceStatus: 'Normal', status: 'Standby', history: [{ id: 'REC-201', date: '2024-05-06', description: 'Pre-induction inspection', technician: 'P. Nair', type: 'Periodic' }] },
    { id: 'C-402', type: 'Trailer', health: 96, mileage: 120, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    { id: 'C-403', type: 'Trailer', health: 95, mileage: 120, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    { id: 'E-404', type: 'Driving', health: 98, mileage: 120, maintenanceStatus: 'Normal', status: 'Standby', history: [] },
    
    { id: 'E-501', type: 'Driving', health: 62, mileage: 1100, maintenanceStatus: 'Inspection Due', status: 'Idle', history: [{ id: 'REC-155', date: '2024-03-12', description: 'Door sensor calibration', technician: 'K. Pillai', type: 'Corrective' }] },
    { id: 'C-502', type: 'Trailer', health: 70, mileage: 1100, maintenanceStatus: 'Normal', status: 'Idle', history: [] },
    { id: 'E-601', type: 'Driving', health: 85, mileage: 450, maintenanceStatus: 'Normal', status: 'Cleaning', history: [] },
];

export const INITIAL_FLEET: FleetUnit[] = [
    { 
        id: 'KMRTS_101', status: 'In Service', mileage: 12500, fc_valid: true, job_card: 'Closed', health: 95, 
        coaches: ['E-101', 'C-102', 'C-103', 'E-104'], route: 'Line 1: Aluva - SN Junction', startTime: '05:30',
        maintenanceRequired: false, cleaningRequired: false
    },
    { 
        id: 'KMRTS_201', status: 'In Service', mileage: 8400, fc_valid: true, job_card: 'Closed', health: 91, 
        coaches: ['E-301', 'C-302', 'C-202', 'E-304'], route: 'Line 1: Aluva - Petta', startTime: '09:15',
        maintenanceRequired: false, cleaningRequired: false
    },
    { 
        id: 'KMRTS_310', status: 'Maintenance', mileage: 15600, health: 42, 
        coaches: ['E-201', 'C-303'], route: 'Muttom Depot Maintenance', startTime: 'N/A',
        maintenanceRequired: true, cleaningRequired: false
    },
    {
        id: 'KMRTS_400', status: 'Cleaning', mileage: 9200, health: 85,
        coaches: ['E-601'], route: 'Muttom Yard Wash', startTime: 'N/A',
        maintenanceRequired: false, cleaningRequired: true
    }
];

export const INITIAL_SCHEDULE: ScheduleItem[] = [
    { id: 'SCH_001', trainId: 'KMRTS_101', time: '05:30', route: 'Line 1: Aluva - SN Junction', status: 'Active', controlStatus: 'Approved' },
    { id: 'SCH_002', trainId: 'KMRTS_201', time: '09:15', route: 'Line 1: Aluva - Petta', status: 'Active', controlStatus: 'Approved' },
    { id: 'SCH_003', trainId: 'KMRTS_310', time: 'N/A', route: 'Muttom Depot Maintenance', status: 'Standby', controlStatus: 'Pending' },
];

export const INITIAL_MAINTENANCE_QUEUE: MaintenanceSlot[] = [
    { queueNumber: 1, type: 'Maintenance', trainId: 'KMRTS_310', time: '14:00', status: 'In Progress', isSlotAvailable: false, bayId: 'M-BAY-1' },
];

export const INITIAL_CLEANING_QUEUE: MaintenanceSlot[] = [
    { queueNumber: 1, type: 'Cleaning', trainId: 'KMRTS_201', time: '15:30', status: 'Waiting', isSlotAvailable: true },
];

export const INITIAL_MAINTENANCE_BAYS: Bay[] = [
    { id: 'M-BAY-1', status: 'Occupied', functional: true, currentTask: 'KMRTS_310' },
    { id: 'M-BAY-2', status: 'Available', functional: true, currentTask: null },
    { id: 'M-BAY-3', status: 'Available', functional: true, currentTask: null },
];

export const INITIAL_CLEANING_BAYS: Bay[] = [
    { id: 'C-BAY-1', status: 'Occupied', functional: true, currentTask: 'KMRTS_400' },
    { id: 'C-BAY-2', status: 'Available', functional: true, currentTask: null },
    { id: 'C-BAY-3', status: 'Maintenance', functional: false, currentTask: null },
    { id: 'C-BAY-4', status: 'Available', functional: true, currentTask: null },
];
