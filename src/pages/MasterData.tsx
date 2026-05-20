import React, { useState, useEffect } from 'react';
import { 
    Database, 
    RefreshCw, 
    Activity, 
    Layers, 
    FileSpreadsheet, 
    CheckCircle2, 
    TrendingUp,
    AlertTriangle,
    Search,
    Terminal,
    ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../utils';
import { supabase } from '../services/supabase';

export const MasterData = () => {
    const { 
        fleet, setFleet, coaches, setCoaches, 
        schedule, setSchedule, maintenanceQueue, setMaintenanceQueue,
        cleaningQueue, setCleaningQueue, maintenanceBays, setMaintenanceBays,
        cleaningBays, setCleaningBays
    } = useAppContext();
    
    const [syncing, setSyncing] = useState(false);
    const [occLatency, setOccLatency] = useState(40);
    const [depotLatency, setDepotLatency] = useState(120);

    // Database explorer states
    const [selectedTable, setSelectedTable] = useState<'fleet_units' | 'coaches' | 'schedule_items' | 'maintenance_slots' | 'bays'>('fleet_units');
    const [tableData, setTableData] = useState<any[]>([]);
    const [fetchingTable, setFetchingTable] = useState(false);
    const [dbSearchQuery, setDbSearchQuery] = useState('');

    // Dynamic latency fluctuations to make the dashboard feel "alive"
    useEffect(() => {
        const interval = setInterval(() => {
            setOccLatency(prev => Math.max(35, Math.min(65, prev + Math.floor(Math.random() * 7) - 3)));
            setDepotLatency(prev => Math.max(105, Math.min(135, prev + Math.floor(Math.random() * 11) - 5)));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Load table data when selected table changes
    useEffect(() => {
        fetchTableContent(selectedTable);
    }, [selectedTable]);

    const fetchTableContent = async (tableName: string) => {
        setFetchingTable(true);
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*');
                
            if (error) throw error;
            
            // Sort to ensure consistent order
            const sortedData = [...(data || [])].sort((a, b) => {
                if (a.id && b.id) return String(a.id).localeCompare(String(b.id));
                if (a.queue_number && b.queue_number) return a.queue_number - b.queue_number;
                return 0;
            });
            
            setTableData(sortedData);
        } catch (err: any) {
            console.error("Error fetching table content from Supabase:", err);
            // Fallback: Map context data if Supabase offline/error
            if (tableName === 'fleet_units') {
                setTableData(fleet.map(f => ({
                    id: f.id,
                    status: f.status,
                    mileage: f.mileage,
                    health: f.health,
                    coaches: f.coaches,
                    route: f.route,
                    start_time: f.startTime,
                    maintenance_required: f.maintenanceRequired,
                    cleaning_required: f.cleaningRequired,
                    fc_valid: f.fcValid,
                    job_card: f.jobCard,
                    branding: f.branding,
                    run_number: f.runNumber,
                    recall_requested: f.recallRequested
                })));
            } else if (tableName === 'coaches') {
                setTableData(coaches.map(c => ({
                    id: c.id,
                    type: c.type,
                    health: c.health,
                    mileage: c.mileage,
                    maintenance_status: c.maintenanceStatus,
                    status: c.status,
                    history: c.history
                })));
            } else if (tableName === 'schedule_items') {
                setTableData(schedule.map(s => ({
                    id: s.id,
                    train_id: s.trainId,
                    time: s.time,
                    route: s.route,
                    status: s.status,
                    control_status: s.controlStatus,
                    run_number: s.runNumber
                })));
            } else if (tableName === 'maintenance_slots') {
                const slots = [...maintenanceQueue, ...cleaningQueue];
                setTableData(slots.map(s => ({
                    id: s.id,
                    queue_number: s.queueNumber,
                    type: s.type,
                    train_id: s.trainId,
                    time: s.time,
                    status: s.status,
                    is_slot_available: s.isSlotAvailable,
                    start_time: s.startTime,
                    bay_id: s.bayId
                })));
            } else if (tableName === 'bays') {
                const bays = [...maintenanceBays, ...cleaningBays];
                setTableData(bays.map(b => ({
                    id: b.id,
                    type: b.type,
                    status: b.status,
                    functional: b.functional,
                    current_task: b.currentTask
                })));
            }
        } finally {
            setFetchingTable(false);
        }
    };

    const fetchTelemetry = async () => {
        setSyncing(true);
        try {
            // Re-fetch direct Supabase values to show true real-time database updates
            const [
                { data: fleetData, error: fleetErr },
                { data: coachesData, error: coachesErr },
                { data: scheduleData, error: scheduleErr },
                { data: slotsData, error: slotsErr },
                { data: baysData, error: baysErr }
            ] = await Promise.all([
                supabase.from('fleet_units').select('*'),
                supabase.from('coaches').select('*'),
                supabase.from('schedule_items').select('*'),
                supabase.from('maintenance_slots').select('*'),
                supabase.from('bays').select('*')
            ]);

            if (fleetErr) throw fleetErr;
            if (coachesErr) throw coachesErr;
            if (scheduleErr) throw scheduleErr;
            if (slotsErr) throw slotsErr;
            if (baysErr) throw baysErr;

            setFleet((fleetData || []).map(f => ({
                ...f,
                startTime: f.start_time,
                maintenanceRequired: f.maintenance_required,
                cleaningRequired: f.cleaning_required,
                runNumber: f.run_number,
                recallRequested: f.recall_requested,
            })));

            setCoaches((coachesData || []).map(c => ({
                ...c,
                maintenanceStatus: c.maintenance_status,
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

            // Refresh current explorer content
            await fetchTableContent(selectedTable);

            // Success feedback
            setTimeout(() => {
                setSyncing(false);
                alert("Supabase Real-Time database schemas successfully synchronized!");
            }, 800);
        } catch (err: any) {
            console.error("Error refreshing telemetry:", err);
            setSyncing(false);
            alert("Telemetry sync failed: " + err.message);
        }
    };

    const getTableColumns = (table: string) => {
        switch(table) {
            case 'fleet_units':
                return ['id', 'status', 'mileage', 'health', 'coaches', 'route', 'start_time', 'maintenance_required', 'cleaning_required', 'recall_requested'];
            case 'coaches':
                return ['id', 'type', 'health', 'mileage', 'maintenance_status', 'status'];
            case 'schedule_items':
                return ['id', 'train_id', 'time', 'route', 'status', 'control_status', 'run_number'];
            case 'maintenance_slots':
                return ['id', 'queue_number', 'type', 'train_id', 'time', 'status', 'is_slot_available', 'bay_id'];
            case 'bays':
                return ['id', 'type', 'status', 'functional', 'current_task'];
            default:
                return [];
        }
    };

    const tablesList = [
        { id: 'fleet_units', label: 'fleet_units', desc: 'Active rolling stock & stabling allocations', count: fleet.length },
        { id: 'coaches', label: 'coaches', desc: 'Individually tracked railcar elements', count: coaches.length },
        { id: 'schedule_items', label: 'schedule_items', desc: 'Inductions & active route assignments', count: schedule.length },
        { id: 'maintenance_slots', label: 'maintenance_slots', desc: 'Muttom depot queue reservations', count: (maintenanceQueue.length + cleaningQueue.length) },
        { id: 'bays', label: 'bays', desc: 'Mechanical checkup & cleaning bays', count: (maintenanceBays.length + cleaningBays.length) },
    ] as const;

    // Filter table content based on search query
    const columns = getTableColumns(selectedTable);
    const filteredRows = tableData.filter(row => {
        if (!dbSearchQuery) return true;
        return columns.some(col => {
            const val = row[col];
            if (val === null || val === undefined) return false;
            if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(dbSearchQuery.toLowerCase());
            return String(val).toLowerCase().includes(dbSearchQuery.toLowerCase());
        });
    });

    return (
        <section className="col-span-12 space-y-6">
            
            {/* Header row */}
            <div className="flex justify-between items-center bg-transparent">
                <div>
                    <h2 className="font-display font-black text-2xl text-slate-800 tracking-tight">Unified Data Sources</h2>
                    <p className="text-xs text-slate-500 font-medium">PostgreSQL live schema explorer & SCADA telemetry sync</p>
                </div>
                
                <button 
                    onClick={fetchTelemetry}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-metro-blue font-bold text-xs shadow-sm transition-all duration-200"
                >
                    <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", syncing && "animate-spin text-metro-blue")} />
                    <span>{syncing ? "Synchronizing DB..." : "Fetch Fresh Telemetry"}</span>
                </button>
            </div>

            {/* Three Visual Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* OCC Feed Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">OCC Feed</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Frequency Headway</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black text-slate-700">Live</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Latency: <span className="font-bold text-slate-600">{occLatency}ms</span></p>
                    </div>
                </div>

                {/* Depot Management Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-metro-blue flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">Depot Management</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Yard Allocations</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-black text-slate-700">Active</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Latency: <span className="font-bold text-slate-600">{depotLatency}ms</span></p>
                    </div>
                </div>

                {/* ERP/Maintenance Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-metro-orange flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">ERP/Maintenance</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Asset Management</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs font-black text-slate-700">Standby</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Latency: <span className="font-bold text-slate-600">2s</span></p>
                    </div>
                </div>

            </div>

            {/* Live Database Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Tables Sidebar */}
                <div className="lg:col-span-3 space-y-3">
                    <div className="p-4 bg-slate-900 border border-slate-850 rounded-2xl text-white shadow-sm flex items-center gap-3">
                        <Database className="w-5 h-5 text-metro-blue" />
                        <div>
                            <h4 className="text-xs font-black tracking-wider uppercase">SCHEMA V1.2</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">PostgreSQL Engine</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-1 shadow-sm">
                        {tablesList.map(table => {
                            const isSelected = selectedTable === table.id;
                            return (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table.id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                                        isSelected 
                                            ? "bg-slate-100 text-slate-900 font-bold border border-slate-200" 
                                            : "hover:bg-slate-50/70 text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <div className="space-y-0.5">
                                        <p className={cn("text-xs font-mono font-bold flex items-center gap-1.5", isSelected ? "text-metro-blue font-extrabold" : "text-slate-600")}>
                                            <Terminal className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>{table.label}</span>
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium tracking-tight truncate max-w-[160px]">{table.desc}</p>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-mono px-2 py-0.5 rounded-full text-center font-bold",
                                        isSelected ? "bg-metro-blue text-white" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {table.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Database Table spreadsheet View */}
                <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h3 className="font-mono font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1">
                                <span>TABLE</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-metro-blue font-extrabold">{selectedTable}</span>
                            </h3>
                            <span className="text-[9px] font-mono text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.2 rounded">
                                {filteredRows.length} Rows
                            </span>
                        </div>

                        {/* Search in spreadsheet */}
                        <div className="relative w-full sm:w-[240px]">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <Search className="w-3.5 h-3.5" />
                            </span>
                            <input 
                                type="text"
                                value={dbSearchQuery}
                                onChange={(e) => setDbSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-metro-blue focus:ring-1 focus:ring-metro-blue/15"
                                placeholder="Search table cells..."
                            />
                        </div>
                    </div>

                    {/* Spreadsheet grid */}
                    <div className="flex-1 overflow-auto max-h-[460px] no-scrollbar">
                        {fetchingTable ? (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-metro-blue" />
                                <p className="text-xs text-slate-500 font-bold">Executing PostgreSQL Query...</p>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-8">
                                <AlertTriangle className="w-6 h-6 text-slate-300 mb-2" />
                                <p>No records found in table matching cell queries.</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse border-spacing-0 select-text">
                                <thead className="sticky top-0 bg-slate-50 z-20 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                                    <tr className="divide-x divide-slate-200">
                                        <th className="bg-slate-100 border-b border-r border-slate-200 w-8 select-none"></th>
                                        {columns.map(col => (
                                            <th key={col} className="border-b border-slate-200 py-2 px-3 text-left font-mono font-extrabold text-[9px] text-slate-500 uppercase tracking-wider select-none bg-slate-100/80">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                    {filteredRows.map((row, index) => (
                                        <tr key={row.id || index} className="divide-x divide-slate-150 hover:bg-slate-50/50 transition-colors">
                                            {/* Row ID Index indicator like Excel */}
                                            <td className="bg-slate-50/70 border-r border-slate-200 text-center text-[9px] font-mono text-slate-400 font-extrabold select-none py-1.5 w-8">
                                                {index + 1}
                                            </td>
                                            {columns.map(col => {
                                                const cellValue = row[col];
                                                
                                                // Beautify values
                                                let renderVal = String(cellValue ?? 'NULL');
                                                if (typeof cellValue === 'boolean') {
                                                    renderVal = cellValue ? 'TRUE' : 'FALSE';
                                                } else if (Array.isArray(cellValue)) {
                                                    renderVal = `[${cellValue.join(', ')}]`;
                                                }
                                                
                                                const isNull = cellValue === null || cellValue === undefined;
                                                const isTrue = cellValue === true;
                                                const isFalse = cellValue === false;

                                                return (
                                                    <td 
                                                        key={col} 
                                                        className={cn(
                                                            "py-1.5 px-3 font-mono text-[10px] truncate max-w-[200px]",
                                                            isNull ? "text-slate-350 italic font-semibold" : 
                                                            isTrue ? "text-green-600 font-black" : 
                                                            isFalse ? "text-red-500 font-black" : 
                                                            col === 'id' ? "text-slate-800 font-bold" : "text-slate-600"
                                                        )}
                                                        title={renderVal}
                                                    >
                                                        {renderVal}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

        </section>
    );
};
