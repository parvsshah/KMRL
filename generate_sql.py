import random
from datetime import datetime, timedelta

output = []

output.append('-- Enable UUID extension')
output.append('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
output.append('')
output.append('-- Drop existing tables so we start fresh with the new rules')
output.append('DROP TABLE IF EXISTS maintenance_slots CASCADE;')
output.append('DROP TABLE IF EXISTS schedule_items CASCADE;')
output.append('DROP TABLE IF EXISTS bays CASCADE;')
output.append('DROP TABLE IF EXISTS fleet_units CASCADE;')
output.append('DROP TABLE IF EXISTS coaches CASCADE;')
output.append('')
output.append('-- Table: coaches')
output.append('CREATE TABLE IF NOT EXISTS coaches (')
output.append('    id TEXT PRIMARY KEY,')
output.append('    type TEXT NOT NULL, -- \'DMC\' or \'TC\'')
output.append('    health INTEGER NOT NULL,')
output.append('    mileage INTEGER NOT NULL,')
output.append('    maintenance_status TEXT NOT NULL,')
output.append('    status TEXT NOT NULL,')
output.append('    history JSONB DEFAULT \'[]\'::jsonb')
output.append(');')
output.append('')
output.append('-- Table: fleet_units')
output.append('CREATE TABLE IF NOT EXISTS fleet_units (')
output.append('    id TEXT PRIMARY KEY,')
output.append('    status TEXT NOT NULL,')
output.append('    mileage INTEGER NOT NULL,')
output.append('    health INTEGER NOT NULL,')
output.append('    coaches JSONB DEFAULT \'[]\'::jsonb,')
output.append('    route TEXT,')
output.append('    start_time TEXT,')
output.append('    maintenance_required BOOLEAN NOT NULL DEFAULT FALSE,')
output.append('    cleaning_required BOOLEAN NOT NULL DEFAULT FALSE,')
output.append('    fc_valid BOOLEAN DEFAULT TRUE,')
output.append('    job_card TEXT,')
output.append('    branding TEXT,')
output.append('    run_number TEXT,')
output.append('    recall_requested BOOLEAN NOT NULL DEFAULT FALSE')
output.append(');')
output.append('')
output.append('-- Table: schedule_items')
output.append('CREATE TABLE IF NOT EXISTS schedule_items (')
output.append('    id TEXT PRIMARY KEY,')
output.append('    train_id TEXT NOT NULL REFERENCES fleet_units(id) ON DELETE CASCADE,')
output.append('    time TEXT NOT NULL,')
output.append('    route TEXT,')
output.append('    status TEXT NOT NULL,')
output.append('    control_status TEXT NOT NULL,')
output.append('    run_number TEXT')
output.append(');')
output.append('')
output.append('-- Table: maintenance_slots (Fixed foreign key)')
output.append('CREATE TABLE IF NOT EXISTS maintenance_slots (')
output.append('    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),')
output.append('    queue_number INTEGER NOT NULL,')
output.append('    type TEXT NOT NULL,')
output.append('    train_id TEXT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,')
output.append('    time TEXT NOT NULL,')
output.append('    status TEXT NOT NULL,')
output.append('    is_slot_available BOOLEAN NOT NULL,')
output.append('    start_time TEXT,')
output.append('    bay_id TEXT')
output.append(');')
output.append('')
output.append('-- Table: bays')
output.append('CREATE TABLE IF NOT EXISTS bays (')
output.append('    id TEXT PRIMARY KEY,')
output.append('    type TEXT NOT NULL, -- \'Maintenance\' or \'Cleaning\'')
output.append('    status TEXT NOT NULL,')
output.append('    functional BOOLEAN NOT NULL DEFAULT TRUE,')
output.append('    current_task TEXT REFERENCES coaches(id) ON DELETE SET NULL')
output.append(');')
output.append('')

# Generate Data
coaches_sql = []
fleet_sql = []
schedule_sql = []

# Status distributions
# 19 In Service
# 3 Standby
# 3 Maintenance
status_list = ['In Service'] * 19 + ['Standby'] * 3 + ['Maintenance'] * 3
random.shuffle(status_list)

start_dt = datetime.strptime("06:00", "%H:%M")
routes = ['Line 1: Aluva - SN Junction', 'Line 1: Thrippunithura - Aluva']

active_count = 0
for i in range(1, 26):
    train_id = f"KM{i:02d}"
    train_status = status_list[i-1]
    
    # Generate 3 coaches for this train
    dmc1_id = f"DMC1-{i:02d}"
    tc_id = f"TC-{i:02d}"
    dmc2_id = f"DMC2-{i:02d}"
    
    mileage = random.randint(1000, 25000)
    health = random.randint(85, 100) if train_status != 'Maintenance' else random.randint(40, 75)
    
    coach_status = train_status if train_status != 'In Service' else 'Active'
    
    coaches_arr = f"[\"{dmc1_id}\", \"{tc_id}\", \"{dmc2_id}\"]"
    
    # Coaches
    coaches_sql.append(f"('{dmc1_id}', 'DMC', {health}, {mileage}, 'Normal', '{coach_status}', '[]')")
    coaches_sql.append(f"('{tc_id}', 'TC', {health}, {mileage}, 'Normal', '{coach_status}', '[]')")
    coaches_sql.append(f"('{dmc2_id}', 'DMC', {health}, {mileage}, 'Normal', '{coach_status}', '[]')")
    
    # Fleet Unit
    if train_status == 'In Service':
        # Every 7 minutes
        dispatch_time = start_dt + timedelta(minutes=7 * active_count)
        time_str = dispatch_time.strftime("%H:%M")
        route = routes[active_count % 2]
        run_number = f"{'R' if 'Aluva' in route else 'S'}-{active_count+1:02d}"
        fleet_sql.append(f"('{train_id}', '{train_status}', {mileage}, {health}, '{coaches_arr}', '{route}', '{time_str}', false, false, true, 'Closed', 'Standard', '{run_number}', false)")
        
        # Schedule Items
        sched_id = f"SCH_{i:03d}"
        schedule_sql.append(f"('{sched_id}', '{train_id}', '{time_str}', '{route}', 'Active', 'Approved', '{run_number}')")
        
        active_count += 1
    elif train_status == 'Standby':
        fleet_sql.append(f"('{train_id}', '{train_status}', {mileage}, {health}, '{coaches_arr}', NULL, NULL, false, false, true, 'Closed', 'Standard', NULL, false)")
    else: # Maintenance
        fleet_sql.append(f"('{train_id}', '{train_status}', {mileage}, {health}, '{coaches_arr}', NULL, NULL, true, false, true, 'Open', 'Standard', NULL, false)")

output.append('INSERT INTO coaches (id, type, health, mileage, maintenance_status, status, history) VALUES')
output.append(',\n'.join(coaches_sql) + ';')
output.append('')
output.append('INSERT INTO fleet_units (id, status, mileage, health, coaches, route, start_time, maintenance_required, cleaning_required, fc_valid, job_card, branding, run_number, recall_requested) VALUES')
output.append(',\n'.join(fleet_sql) + ';')
output.append('')
output.append('INSERT INTO schedule_items (id, train_id, time, route, status, control_status, run_number) VALUES')
output.append(',\n'.join(schedule_sql) + ';')
output.append('')
output.append('INSERT INTO bays (id, type, status, functional, current_task) VALUES')
output.append("('M-BAY-1', 'Maintenance', 'Available', true, NULL),")
output.append("('M-BAY-2', 'Maintenance', 'Available', true, NULL),")
output.append("('M-BAY-3', 'Maintenance', 'Available', true, NULL),")
output.append("('C-BAY-1', 'Cleaning', 'Available', true, NULL),")
output.append("('C-BAY-2', 'Cleaning', 'Available', true, NULL),")
output.append("('C-BAY-3', 'Cleaning', 'Maintenance', false, NULL),")
output.append("('C-BAY-4', 'Cleaning', 'Available', true, NULL);")

with open("/Users/parvshah/Downloads/kmrl-smart-induction-controller/supabase_schema_update.sql", "w") as f:
    f.write('\n'.join(output))

print("SQL generated.")
