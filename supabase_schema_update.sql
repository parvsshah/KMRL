-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables so we start fresh with the new rules
DROP TABLE IF EXISTS maintenance_slots CASCADE;
DROP TABLE IF EXISTS schedule_items CASCADE;
DROP TABLE IF EXISTS bays CASCADE;
DROP TABLE IF EXISTS fleet_units CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;

-- Table: coaches
CREATE TABLE IF NOT EXISTS coaches (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'DMC' or 'TC'
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
    branding TEXT,
    run_number TEXT,
    recall_requested BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table: schedule_items
CREATE TABLE IF NOT EXISTS schedule_items (
    id TEXT PRIMARY KEY,
    train_id TEXT NOT NULL REFERENCES fleet_units(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    route TEXT,
    status TEXT NOT NULL,
    control_status TEXT NOT NULL,
    run_number TEXT
);

-- Table: maintenance_slots (Fixed foreign key)
CREATE TABLE IF NOT EXISTS maintenance_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_number INTEGER NOT NULL,
    type TEXT NOT NULL,
    train_id TEXT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
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
    current_task TEXT REFERENCES coaches(id) ON DELETE SET NULL
);

INSERT INTO coaches (id, type, health, mileage, maintenance_status, status, history) VALUES
('DMC1-01', 'DMC', 95, 3273, 'Normal', 'Active', '[]'),
('TC-01', 'TC', 95, 3273, 'Normal', 'Active', '[]'),
('DMC2-01', 'DMC', 95, 3273, 'Normal', 'Active', '[]'),
('DMC1-02', 'DMC', 97, 7385, 'Normal', 'Active', '[]'),
('TC-02', 'TC', 97, 7385, 'Normal', 'Active', '[]'),
('DMC2-02', 'DMC', 97, 7385, 'Normal', 'Active', '[]'),
('DMC1-03', 'DMC', 89, 6610, 'Normal', 'Active', '[]'),
('TC-03', 'TC', 89, 6610, 'Normal', 'Active', '[]'),
('DMC2-03', 'DMC', 89, 6610, 'Normal', 'Active', '[]'),
('DMC1-04', 'DMC', 93, 7379, 'Normal', 'Active', '[]'),
('TC-04', 'TC', 93, 7379, 'Normal', 'Active', '[]'),
('DMC2-04', 'DMC', 93, 7379, 'Normal', 'Active', '[]'),
('DMC1-05', 'DMC', 95, 8673, 'Normal', 'Active', '[]'),
('TC-05', 'TC', 95, 8673, 'Normal', 'Active', '[]'),
('DMC2-05', 'DMC', 95, 8673, 'Normal', 'Active', '[]'),
('DMC1-06', 'DMC', 88, 10937, 'Normal', 'Active', '[]'),
('TC-06', 'TC', 88, 10937, 'Normal', 'Active', '[]'),
('DMC2-06', 'DMC', 88, 10937, 'Normal', 'Active', '[]'),
('DMC1-07', 'DMC', 91, 11943, 'Normal', 'Active', '[]'),
('TC-07', 'TC', 91, 11943, 'Normal', 'Active', '[]'),
('DMC2-07', 'DMC', 91, 11943, 'Normal', 'Active', '[]'),
('DMC1-08', 'DMC', 86, 5851, 'Normal', 'Active', '[]'),
('TC-08', 'TC', 86, 5851, 'Normal', 'Active', '[]'),
('DMC2-08', 'DMC', 86, 5851, 'Normal', 'Active', '[]'),
('DMC1-09', 'DMC', 40, 17424, 'Normal', 'Maintenance', '[]'),
('TC-09', 'TC', 40, 17424, 'Normal', 'Maintenance', '[]'),
('DMC2-09', 'DMC', 40, 17424, 'Normal', 'Maintenance', '[]'),
('DMC1-10', 'DMC', 89, 1215, 'Normal', 'Active', '[]'),
('TC-10', 'TC', 89, 1215, 'Normal', 'Active', '[]'),
('DMC2-10', 'DMC', 89, 1215, 'Normal', 'Active', '[]'),
('DMC1-11', 'DMC', 87, 19007, 'Normal', 'Active', '[]'),
('TC-11', 'TC', 87, 19007, 'Normal', 'Active', '[]'),
('DMC2-11', 'DMC', 87, 19007, 'Normal', 'Active', '[]'),
('DMC1-12', 'DMC', 92, 5733, 'Normal', 'Active', '[]'),
('TC-12', 'TC', 92, 5733, 'Normal', 'Active', '[]'),
('DMC2-12', 'DMC', 92, 5733, 'Normal', 'Active', '[]'),
('DMC1-13', 'DMC', 86, 5075, 'Normal', 'Standby', '[]'),
('TC-13', 'TC', 86, 5075, 'Normal', 'Standby', '[]'),
('DMC2-13', 'DMC', 86, 5075, 'Normal', 'Standby', '[]'),
('DMC1-14', 'DMC', 98, 8772, 'Normal', 'Active', '[]'),
('TC-14', 'TC', 98, 8772, 'Normal', 'Active', '[]'),
('DMC2-14', 'DMC', 98, 8772, 'Normal', 'Active', '[]'),
('DMC1-15', 'DMC', 45, 1013, 'Normal', 'Maintenance', '[]'),
('TC-15', 'TC', 45, 1013, 'Normal', 'Maintenance', '[]'),
('DMC2-15', 'DMC', 45, 1013, 'Normal', 'Maintenance', '[]'),
('DMC1-16', 'DMC', 100, 3688, 'Normal', 'Standby', '[]'),
('TC-16', 'TC', 100, 3688, 'Normal', 'Standby', '[]'),
('DMC2-16', 'DMC', 100, 3688, 'Normal', 'Standby', '[]'),
('DMC1-17', 'DMC', 91, 8962, 'Normal', 'Active', '[]'),
('TC-17', 'TC', 91, 8962, 'Normal', 'Active', '[]'),
('DMC2-17', 'DMC', 91, 8962, 'Normal', 'Active', '[]'),
('DMC1-18', 'DMC', 87, 13458, 'Normal', 'Active', '[]'),
('TC-18', 'TC', 87, 13458, 'Normal', 'Active', '[]'),
('DMC2-18', 'DMC', 87, 13458, 'Normal', 'Active', '[]'),
('DMC1-19', 'DMC', 96, 5558, 'Normal', 'Active', '[]'),
('TC-19', 'TC', 96, 5558, 'Normal', 'Active', '[]'),
('DMC2-19', 'DMC', 96, 5558, 'Normal', 'Active', '[]'),
('DMC1-20', 'DMC', 67, 21323, 'Normal', 'Maintenance', '[]'),
('TC-20', 'TC', 67, 21323, 'Normal', 'Maintenance', '[]'),
('DMC2-20', 'DMC', 67, 21323, 'Normal', 'Maintenance', '[]'),
('DMC1-21', 'DMC', 98, 18755, 'Normal', 'Active', '[]'),
('TC-21', 'TC', 98, 18755, 'Normal', 'Active', '[]'),
('DMC2-21', 'DMC', 98, 18755, 'Normal', 'Active', '[]'),
('DMC1-22', 'DMC', 95, 16797, 'Normal', 'Active', '[]'),
('TC-22', 'TC', 95, 16797, 'Normal', 'Active', '[]'),
('DMC2-22', 'DMC', 95, 16797, 'Normal', 'Active', '[]'),
('DMC1-23', 'DMC', 99, 20590, 'Normal', 'Standby', '[]'),
('TC-23', 'TC', 99, 20590, 'Normal', 'Standby', '[]'),
('DMC2-23', 'DMC', 99, 20590, 'Normal', 'Standby', '[]'),
('DMC1-24', 'DMC', 89, 21896, 'Normal', 'Active', '[]'),
('TC-24', 'TC', 89, 21896, 'Normal', 'Active', '[]'),
('DMC2-24', 'DMC', 89, 21896, 'Normal', 'Active', '[]'),
('DMC1-25', 'DMC', 99, 4628, 'Normal', 'Active', '[]'),
('TC-25', 'TC', 99, 4628, 'Normal', 'Active', '[]'),
('DMC2-25', 'DMC', 99, 4628, 'Normal', 'Active', '[]');

INSERT INTO fleet_units (id, status, mileage, health, coaches, route, start_time, maintenance_required, cleaning_required, fc_valid, job_card, branding, run_number, recall_requested) VALUES
('KM01', 'In Service', 3273, 95, '["DMC1-01", "TC-01", "DMC2-01"]', 'Line 1: Aluva - SN Junction', '06:00', false, false, true, 'Closed', 'Standard', 'R-01', false),
('KM02', 'In Service', 7385, 97, '["DMC1-02", "TC-02", "DMC2-02"]', 'Line 1: Thrippunithura - Aluva', '06:07', false, false, true, 'Closed', 'Standard', 'R-02', false),
('KM03', 'In Service', 6610, 89, '["DMC1-03", "TC-03", "DMC2-03"]', 'Line 1: Aluva - SN Junction', '06:14', false, false, true, 'Closed', 'Standard', 'R-03', false),
('KM04', 'In Service', 7379, 93, '["DMC1-04", "TC-04", "DMC2-04"]', 'Line 1: Thrippunithura - Aluva', '06:21', false, false, true, 'Closed', 'Standard', 'R-04', false),
('KM05', 'In Service', 8673, 95, '["DMC1-05", "TC-05", "DMC2-05"]', 'Line 1: Aluva - SN Junction', '06:28', false, false, true, 'Closed', 'Standard', 'R-05', false),
('KM06', 'In Service', 10937, 88, '["DMC1-06", "TC-06", "DMC2-06"]', 'Line 1: Thrippunithura - Aluva', '06:35', false, false, true, 'Closed', 'Standard', 'R-06', false),
('KM07', 'In Service', 11943, 91, '["DMC1-07", "TC-07", "DMC2-07"]', 'Line 1: Aluva - SN Junction', '06:42', false, false, true, 'Closed', 'Standard', 'R-07', false),
('KM08', 'In Service', 5851, 86, '["DMC1-08", "TC-08", "DMC2-08"]', 'Line 1: Thrippunithura - Aluva', '06:49', false, false, true, 'Closed', 'Standard', 'R-08', false),
('KM09', 'Maintenance', 17424, 40, '["DMC1-09", "TC-09", "DMC2-09"]', NULL, NULL, true, false, true, 'Open', 'Standard', NULL, false),
('KM10', 'In Service', 1215, 89, '["DMC1-10", "TC-10", "DMC2-10"]', 'Line 1: Aluva - SN Junction', '06:56', false, false, true, 'Closed', 'Standard', 'R-09', false),
('KM11', 'In Service', 19007, 87, '["DMC1-11", "TC-11", "DMC2-11"]', 'Line 1: Thrippunithura - Aluva', '07:03', false, false, true, 'Closed', 'Standard', 'R-10', false),
('KM12', 'In Service', 5733, 92, '["DMC1-12", "TC-12", "DMC2-12"]', 'Line 1: Aluva - SN Junction', '07:10', false, false, true, 'Closed', 'Standard', 'R-11', false),
('KM13', 'Standby', 5075, 86, '["DMC1-13", "TC-13", "DMC2-13"]', NULL, NULL, false, false, true, 'Closed', 'Standard', NULL, false),
('KM14', 'In Service', 8772, 98, '["DMC1-14", "TC-14", "DMC2-14"]', 'Line 1: Thrippunithura - Aluva', '07:17', false, false, true, 'Closed', 'Standard', 'R-12', false),
('KM15', 'Maintenance', 1013, 45, '["DMC1-15", "TC-15", "DMC2-15"]', NULL, NULL, true, false, true, 'Open', 'Standard', NULL, false),
('KM16', 'Standby', 3688, 100, '["DMC1-16", "TC-16", "DMC2-16"]', NULL, NULL, false, false, true, 'Closed', 'Standard', NULL, false),
('KM17', 'In Service', 8962, 91, '["DMC1-17", "TC-17", "DMC2-17"]', 'Line 1: Aluva - SN Junction', '07:24', false, false, true, 'Closed', 'Standard', 'R-13', false),
('KM18', 'In Service', 13458, 87, '["DMC1-18", "TC-18", "DMC2-18"]', 'Line 1: Thrippunithura - Aluva', '07:31', false, false, true, 'Closed', 'Standard', 'R-14', false),
('KM19', 'In Service', 5558, 96, '["DMC1-19", "TC-19", "DMC2-19"]', 'Line 1: Aluva - SN Junction', '07:38', false, false, true, 'Closed', 'Standard', 'R-15', false),
('KM20', 'Maintenance', 21323, 67, '["DMC1-20", "TC-20", "DMC2-20"]', NULL, NULL, true, false, true, 'Open', 'Standard', NULL, false),
('KM21', 'In Service', 18755, 98, '["DMC1-21", "TC-21", "DMC2-21"]', 'Line 1: Thrippunithura - Aluva', '07:45', false, false, true, 'Closed', 'Standard', 'R-16', false),
('KM22', 'In Service', 16797, 95, '["DMC1-22", "TC-22", "DMC2-22"]', 'Line 1: Aluva - SN Junction', '07:52', false, false, true, 'Closed', 'Standard', 'R-17', false),
('KM23', 'Standby', 20590, 99, '["DMC1-23", "TC-23", "DMC2-23"]', NULL, NULL, false, false, true, 'Closed', 'Standard', NULL, false),
('KM24', 'In Service', 21896, 89, '["DMC1-24", "TC-24", "DMC2-24"]', 'Line 1: Thrippunithura - Aluva', '07:59', false, false, true, 'Closed', 'Standard', 'R-18', false),
('KM25', 'In Service', 4628, 99, '["DMC1-25", "TC-25", "DMC2-25"]', 'Line 1: Aluva - SN Junction', '08:06', false, false, true, 'Closed', 'Standard', 'R-19', false);

INSERT INTO schedule_items (id, train_id, time, route, status, control_status, run_number) VALUES
('SCH_001', 'KM01', '06:00', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-01'),
('SCH_002', 'KM02', '06:07', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-02'),
('SCH_003', 'KM03', '06:14', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-03'),
('SCH_004', 'KM04', '06:21', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-04'),
('SCH_005', 'KM05', '06:28', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-05'),
('SCH_006', 'KM06', '06:35', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-06'),
('SCH_007', 'KM07', '06:42', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-07'),
('SCH_008', 'KM08', '06:49', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-08'),
('SCH_010', 'KM10', '06:56', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-09'),
('SCH_011', 'KM11', '07:03', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-10'),
('SCH_012', 'KM12', '07:10', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-11'),
('SCH_014', 'KM14', '07:17', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-12'),
('SCH_017', 'KM17', '07:24', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-13'),
('SCH_018', 'KM18', '07:31', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-14'),
('SCH_019', 'KM19', '07:38', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-15'),
('SCH_021', 'KM21', '07:45', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-16'),
('SCH_022', 'KM22', '07:52', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-17'),
('SCH_024', 'KM24', '07:59', 'Line 1: Thrippunithura - Aluva', 'Active', 'Approved', 'R-18'),
('SCH_025', 'KM25', '08:06', 'Line 1: Aluva - SN Junction', 'Active', 'Approved', 'R-19');

INSERT INTO bays (id, type, status, functional, current_task) VALUES
('M-BAY-1', 'Maintenance', 'Available', true, NULL),
('M-BAY-2', 'Maintenance', 'Available', true, NULL),
('M-BAY-3', 'Maintenance', 'Available', true, NULL),
('C-BAY-1', 'Cleaning', 'Available', true, NULL),
('C-BAY-2', 'Cleaning', 'Available', true, NULL),
('C-BAY-3', 'Cleaning', 'Maintenance', false, NULL),
('C-BAY-4', 'Cleaning', 'Available', true, NULL);