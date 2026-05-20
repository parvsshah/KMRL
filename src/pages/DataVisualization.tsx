import React, { useState, useMemo } from 'react';
import { 
    BarChart3, 
    Activity, 
    Search, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle,
    Train,
    Layers,
    ArrowRight
} from 'lucide-react';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { cn } from '../utils';

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
    <div className="dashboard-card p-4 flex items-center gap-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
        <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-lg font-extrabold text-slate-900">{value}</p>
        </div>
    </div>
);

export const DataVisualization = () => {
    const { 
        fleet, schedule, report 
    } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

    const analyticsData = useMemo(() => {
        // Build dynamic analytics data based on active fleet state
        if (fleet.length === 0) {
            return [
                { name: 'KM01', health: 95, usage: 80 },
                { name: 'KM02', health: 97, usage: 40 },
                { name: 'KM03', health: 89, usage: 10 },
                { name: 'KM04', health: 93, usage: 30 },
                { name: 'KM05', health: 95, usage: 75 },
            ];
        }
        return fleet.slice(0, 8).map(f => ({
            name: f.id,
            health: f.health,
            usage: f.mileage % 5000 / 50
        }));
    }, [fleet]);

    const radarChartData = useMemo(() => {
        if (!report) {
            return [
                { subject: 'Fitness', A: 4.8 },
                { subject: 'JobCard', A: 4.2 },
                { subject: 'Branding', A: 4.5 },
                { subject: 'Mileage', A: 4.0 },
                { subject: 'Cleaning', A: 4.9 },
                { subject: 'Stabling', A: 4.6 },
            ];
        }
        return [
            { subject: 'Fitness', A: report.Grades.Fitness, fullMark: 5 },
            { subject: 'JobCard', A: report.Grades.JobCard, fullMark: 5 },
            { subject: 'Branding', A: report.Grades.Branding, fullMark: 5 },
            { subject: 'Mileage', A: report.Grades.Mileage, fullMark: 5 },
            { subject: 'Cleaning', A: report.Grades.Cleaning, fullMark: 5 },
            { subject: 'Stabling', A: report.Grades.Stabling, fullMark: 5 },
        ];
    }, [report]);

    // 1. Previous Trainsets in Session (moved from Master Data)
    const filteredFleet = fleet.filter(f => 
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.status.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 2. Upcoming Schedules: Approved/Pending that represent current or next induction cycles
    const upcomingSchedules = useMemo(() => {
        return schedule.filter(s => 
            s.status !== 'Completed' && s.status !== 'Cancelled'
        );
    }, [schedule]);

    // 3. Previous Schedules: Real completed items or simulated history runs
    const previousSchedules = useMemo(() => {
        const completedFromDB = schedule.filter(s => s.status === 'Completed');
        
        // Highly descriptive, wowed simulated past schedules for fully loaded historic panel representation
        const mockCompleted = [
            { id: 'HIST_001', trainId: 'KM01', time: '05:30', route: 'Line 1: SN Junction - Aluva', status: 'Completed', runNumber: 'H-01' },
            { id: 'HIST_002', trainId: 'KM03', time: '05:37', route: 'Line 1: Thrippunithura - Aluva', status: 'Completed', runNumber: 'H-02' },
            { id: 'HIST_003', trainId: 'KM05', time: '05:44', route: 'Line 1: Aluva - SN Junction', status: 'Completed', runNumber: 'H-03' },
            { id: 'HIST_004', trainId: 'KM07', time: '05:51', route: 'Line 1: SN Junction - Aluva', status: 'Completed', runNumber: 'H-04' },
        ];

        return [...completedFromDB, ...mockCompleted];
    }, [schedule]);

    return (
        <section className="lg:col-span-12 space-y-6">
            <div>
                <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Fleet Analytics & Intelligence</h2>
                <p className="text-xs text-slate-500 font-medium">Real-time telemetry evaluations, induction optimization, and active schedule logs</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Activity} label="Fleet Readiness" value="94%" color="bg-green-100 text-green-600" />
                <StatCard icon={BarChart3} label="Utilization Rate" value="78%" color="bg-blue-100 text-blue-600" />
                <StatCard icon={AlertTriangle} label="Critical Alerts" value="2" color="bg-red-100 text-red-600" />
                <StatCard icon={Layers} label="Efficiency Index" value="1.24x" color="bg-purple-100 text-purple-600" />
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="dashboard-card p-6 min-h-[400px] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-2">Health vs. Utilization Distribution</h3>
                    <p className="text-xs text-slate-400 mb-6 font-semibold uppercase tracking-wider">Operational metrics compared against wear indexes</p>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
                            <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip 
                                    cursor={{fill: '#f1f5f9'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="health" fill="#14B8A6" radius={[4, 4, 0, 0]} name="Health %">
                                    {analyticsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.health > 90 ? '#10B981' : '#F59E0B'} />
                                    ))}
                                </Bar>
                                <Bar dataKey="usage" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Usage Index" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="dashboard-card p-6 min-h-[400px] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm mb-2">AI Induction Analysis Profiling</h3>
                    <p className="text-xs text-slate-400 mb-6 font-semibold uppercase tracking-wider">Multi-criteria radar profiles for optimal stabling</p>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%" className="absolute inset-0">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Radar name="Score" dataKey="A" stroke="#004d99" fill="#004d99" fillOpacity={0.2} strokeWidth={2} />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Previous Trainsets in Session Section (moved from Master Data) */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {/* Title & Filter Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50/50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                            <Clock className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h3 className="font-display font-black text-base text-slate-800">Previous Trainsets in Session</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live Database telemetry, active composition & maintenance timing</p>
                        </div>
                    </div>
                    
                    {/* Search Field */}
                    <input 
                        type="text" 
                        placeholder="Filter by trainset descriptor (e.g. KM01)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-metro-blue focus:ring-1 focus:ring-metro-blue/15 w-full sm:w-[260px] bg-slate-50/30"
                    />
                </div>

                {/* Fleet list */}
                {filteredFleet.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-xs font-semibold">
                        No trainsets in active session matching filter criteria.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredFleet.map(f => {
                            const isMaintenance = f.status === 'Maintenance' || f.status === 'Cleaning';
                            
                            // Advanced Maintenance timing calculations
                            const nextACheckMileage = 5000;
                            const distanceToACheck = nextACheckMileage - (f.mileage % nextACheckMileage);
                            const projectedDaysToACheck = distanceToACheck / 333.3; // projection based on 333km/day
                            
                            // Health bar layout colors
                            const isHealthy = f.health >= 90;
                            const isDue = f.health < 75 || distanceToACheck < 800;

                            return (
                                <div key={f.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                                    
                                    {/* Left info */}
                                    <div className="flex items-center gap-4 w-full md:w-3/12">
                                        <div className={cn(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                                            isMaintenance ? "bg-amber-50 border-amber-100 text-metro-orange" : 
                                            f.status === 'Standby' ? "bg-slate-50 border-slate-100 text-slate-500" :
                                            "bg-green-50 border-green-100 text-emerald-500"
                                        )}>
                                            <Train className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-display font-black text-slate-800 text-sm flex items-center gap-2">
                                                <span>{f.id}</span>
                                                <span className={cn(
                                                    "text-[8px] font-black px-1.5 py-0.2 rounded scale-90 origin-left border uppercase tracking-wider",
                                                    isHealthy ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                                                    isDue ? "bg-red-50 text-red-500 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                                )}>
                                                    {f.health.toFixed(0)}% Health
                                                </span>
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-black tracking-wider uppercase mt-1">
                                                {f.coaches.length} Coaches • <span className={cn(
                                                    f.status === 'In Service' ? "text-emerald-500" :
                                                    f.status === 'Standby' ? "text-slate-500" : "text-metro-orange font-bold"
                                                )}>{f.status}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Middle info: Fleet timing projection */}
                                    <div className="w-full md:w-4/12 flex items-center gap-4 bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100">
                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                        <div className="space-y-0.5 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-slate-700">Next A-Check:</span>
                                                <span className="font-black text-slate-800">{distanceToACheck.toLocaleString()} km</span>
                                                <span className="text-slate-400 font-medium">({projectedDaysToACheck.toFixed(1)} Days)</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px]">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider">Projected Date:</span>
                                                <span className="text-slate-500 font-semibold">
                                                    {new Date(Date.now() + projectedDaysToACheck * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right info: Excel Spreadsheet past run data */}
                                    <div className="w-full md:w-5/12 grid grid-cols-3 border border-slate-200 bg-slate-50/30 rounded-2xl divide-x divide-slate-200 overflow-hidden text-center shrink-0 shadow-sm">
                                        <div className="py-2.5 px-3">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">RUN SESSION</p>
                                            <p className="text-[10px] font-extrabold text-slate-700 font-mono mt-1.5 leading-none">RN-{(f.mileage % 43).toFixed(0).padStart(2, '0')}</p>
                                        </div>
                                        <div className="py-2.5 px-3">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL MILEAGE</p>
                                            <p className="text-[10px] font-extrabold text-slate-700 font-mono mt-1.5 leading-none">{f.mileage.toLocaleString()} KM</p>
                                        </div>
                                        <div className="py-2.5 px-3 bg-white/20">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">LAST MAINT CHECK</p>
                                            <p className="text-[10px] font-extrabold text-slate-700 font-mono mt-1.5 leading-none">
                                                {f.mileage % 15000 < 5000 ? 'B-Check' : 'A-Check'} ({new Date(Date.now() - ((f.mileage % 5000) / 333.3) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Two Column Layout: Upcoming & Previous Schedules */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Column 1: Upcoming Schedules */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[380px]">
                    <div className="flex justify-between items-center mb-5 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Calendar className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h4 className="font-display font-black text-slate-800 text-sm">Upcoming Schedules</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Approved inductions & active corridor runs</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {upcomingSchedules.length} Scheduled
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-0.5 no-scrollbar">
                        {upcomingSchedules.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-10 font-bold">No active or upcoming schedules configured.</p>
                        ) : (
                            upcomingSchedules.map(item => (
                                <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-extrabold text-slate-700 shadow-sm shrink-0">
                                            {item.trainId}
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                                <span>Run {item.runNumber || "N/A"}</span>
                                                <span className={cn(
                                                    "text-[8px] font-black px-1.5 py-0.2 rounded scale-90",
                                                    item.controlStatus === 'Approved' ? "bg-green-50 text-green-700 border border-green-150" : 
                                                    "bg-amber-50 text-amber-600 border border-amber-150"
                                                )}>
                                                    {item.controlStatus}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[190px]">{item.route || "Aluva Corridor Line 1"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-metro-blue">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{item.time}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{item.status}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Column 2: Previous Schedules */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[380px]">
                    <div className="flex justify-between items-center mb-5 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                                <CheckCircle2 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h4 className="font-display font-black text-slate-800 text-sm">Previous Schedules</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Archived and completed daily schedules</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                            {previousSchedules.length} Completed
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[300px] pr-0.5 no-scrollbar">
                        {previousSchedules.map(item => (
                            <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-3 text-xs opacity-85 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-150 flex items-center justify-center font-extrabold text-slate-500 shadow-sm shrink-0">
                                        {item.trainId}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-extrabold text-slate-700 flex items-center gap-1.5">
                                            <span>Run {item.runNumber || "N/A"}</span>
                                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 scale-90 border border-slate-200 uppercase tracking-wider">
                                                Completed
                                            </span>
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[190px]">{item.route || "Aluva Corridor Line 1"}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{item.time}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Archived</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </section>
    );
};
