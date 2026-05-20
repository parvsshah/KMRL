-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: coaches
CREATE TABLE IF NOT EXISTS coaches (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    health INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    maintenance_status TEXT NOT NULL,
    status TEXT NOT NULL,
    history JSONB DEFAULT '[]'::jsonb
);

-- Table: fleet_units
CREATE TABLE IF NOT EXISTS fleet_units (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    health INTEGER NOT NULL,
    coaches JSONB DEFAULT '[]'::jsonb,
    route TEXT,
    start_time TEXT,
    maintenance_required BOOLEAN NOT NULL DEFAULT FALSE,
    cleaning_required BOOLEAN NOT NULL DEFAULT FALSE,
    fc_valid BOOLEAN DEFAULT TRUE,
    job_card TEXT,
    branding TEXT
);

-- Table: schedule_items
CREATE TABLE IF NOT EXISTS schedule_items (
    id TEXT PRIMARY KEY,
    train_id TEXT NOT NULL REFERENCES fleet_units(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    route TEXT,
    status TEXT NOT NULL,
    control_status TEXT NOT NULL
);

-- Table: maintenance_slots
CREATE TABLE IF NOT EXISTS maintenance_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    train_id TEXT NOT NULL REFERENCES fleet_units(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    status TEXT NOT NULL,
    is_slot_available BOOLEAN NOT NULL,
    start_time TEXT,
    bay_id TEXT
);

-- Table: bays
CREATE TABLE IF NOT EXISTS bays (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'Maintenance' or 'Cleaning'
    status TEXT NOT NULL,
    functional BOOLEAN NOT NULL DEFAULT TRUE,
    current_task TEXT REFERENCES fleet_units(id) ON DELETE SET NULL
);

-- Insert Mock Data

INSERT INTO coaches (id, type, health, mileage, maintenance_status, status, history) VALUES
('E-101', 'Driving', 98, 480, 'Normal', 'Standby', '[{"id": "REC-001", "date": "2024-04-20", "description": "Brake pad replacement at Muttom Depot", "technician": "R. Sharma", "type": "Corrective"}, {"id": "REC-005", "date": "2024-05-04", "description": "Deep interior clean", "technician": "CleanOps", "type": "Cleaning"}]'),
('C-102', 'Trailer', 95, 520, 'Fit Check Due', 'Standby', '[{"id": "REC-002", "date": "2024-04-28", "description": "Periodic Check B", "technician": "A. Varma", "type": "Periodic"}]'),
('C-103', 'Trailer', 92, 610, 'Maint. Required', 'Standby', '[{"id": "REC-015", "date": "2024-04-15", "description": "Wheel Lathe at Muttom Yard", "technician": "J. Paul", "type": "Periodic"}]'),
('E-104', 'Driving', 97, 200, 'Normal', 'Standby', '[{"id": "REC-008", "date": "2024-04-01", "description": "Pantograph Check", "technician": "S. Iyer", "type": "Periodic"}]'),
('E-201', 'Driving', 45, 840, 'Overdue', 'Maintenance', '[{"id": "REC-010", "date": "2024-05-01", "description": "Traction motor overheating", "technician": "S. Iyer", "type": "Corrective"}]'),
('C-202', 'Trailer', 88, 300, 'Normal', 'Active', '[{"id": "REC-112", "date": "2024-02-10", "description": "Internal Lighting Replacement", "technician": "M. Ali", "type": "Corrective"}]'),
('E-301', 'Driving', 91, 150, 'Normal', 'Standby', '[]'),
('C-302', 'Trailer', 94, 50, 'Normal', 'Standby', '[]'),
('C-303', 'Trailer', 89, 550, 'Cleaning Req', 'Standby', '[]'),
('E-304', 'Driving', 93, 410, 'Normal', 'Standby', '[]'),
('E-401', 'Driving', 99, 120, 'Normal', 'Standby', '[{"id": "REC-201", "date": "2024-05-06", "description": "Pre-induction inspection", "technician": "P. Nair", "type": "Periodic"}]'),
('C-402', 'Trailer', 96, 120, 'Normal', 'Standby', '[]'),
('C-403', 'Trailer', 95, 120, 'Normal', 'Standby', '[]'),
('E-404', 'Driving', 98, 120, 'Normal', 'Standby', '[]'),
('E-501', 'Driving', 62, 1100, 'Inspection Due', 'Idle', '[{"id": "REC-155", "date": "2024-03-12", "description": "Door sensor calibration", "technician": "K. Pillai", "type": "Corrective"}]'),
('C-502', 'Trailer', 70, 1100, 'Normal', 'Idle', '[]'),
('E-601', 'Driving', 85, 450, 'Normal', 'Cleaning', '[]')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fleet_units (id, status, mileage, health, coaches, route, start_time, maintenance_required, cleaning_required, fc_valid, job_card) VALUES
('KMRTS_101', 'In Service', 12500, 95, '["E-101", "C-102", "C-103", "E-104"]', 'Line 1: Aluva - SN Junction', '05:30', false, false, true, 'Closed'),
('KMRTS_201', 'In Service', 8400, 91, '["E-301", "C-302", "C-202", "E-304"]', 'Line 1: Aluva - Petta', '09:15', false, false, true, 'Closed'),
('KMRTS_310', 'Maintenance', 15600, 42, '["E-201", "C-303"]', 'Muttom Depot Maintenance', 'N/A', true, false, true, NULL),
('KMRTS_400', 'Cleaning', 9200, 85, '["E-601"]', 'Muttom Yard Wash', 'N/A', false, true, true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO schedule_items (id, train_id, time, route, status, control_status) VALUES
('SCH_001', 'KMRTS_101', '05:30', 'Line 1: Aluva - SN Junction', 'Active', 'Approved'),
('SCH_002', 'KMRTS_201', '09:15', 'Line 1: Aluva - Petta', 'Active', 'Approved'),
('SCH_003', 'KMRTS_310', 'N/A', 'Muttom Depot Maintenance', 'Standby', 'Pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO maintenance_slots (queue_number, type, train_id, time, status, is_slot_available, bay_id) VALUES
(1, 'Maintenance', 'KMRTS_310', '14:00', 'In Progress', false, 'M-BAY-1'),
(1, 'Cleaning', 'KMRTS_201', '15:30', 'Waiting', true, NULL);

INSERT INTO bays (id, type, status, functional, current_task) VALUES
('M-BAY-1', 'Maintenance', 'Occupied', true, 'KMRTS_310'),
('M-BAY-2', 'Maintenance', 'Available', true, NULL),
('M-BAY-3', 'Maintenance', 'Available', true, NULL),
('C-BAY-1', 'Cleaning', 'Occupied', true, 'KMRTS_400'),
('C-BAY-2', 'Cleaning', 'Available', true, NULL),
('C-BAY-3', 'Cleaning', 'Maintenance', false, NULL),
('C-BAY-4', 'Cleaning', 'Available', true, NULL)
ON CONFLICT (id) DO NOTHING;
