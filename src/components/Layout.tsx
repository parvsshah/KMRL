import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { 
    Train, 
    LayoutDashboard,
    ShieldCheck,
    BarChart3,
    History,
    Zap,
    Database,
    AlertTriangle,
    LogOut
} from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';

import kmrlLogo from '../kmrl-logo.png';

export const Layout = () => {
    const { error, isLoading, userRole, setUserRole } = useAppContext();

    if (!userRole) {
        return <Navigate to="/login" replace />;
    }

    const allNavItems = [
        { path: '/', label: 'Planner Dashboard', icon: LayoutDashboard, role: 'Planner' },
        { path: '/supervisor', label: 'Supervisor Bureau', icon: ShieldCheck, role: 'Supervisor' },
        { path: '/analytics', label: 'Fleet Analytics', icon: BarChart3 },
        { path: '/master-data', label: 'Master Data', icon: Database },
        { path: '/reports', label: 'Audit Trail', icon: History }
    ];

    // Filter items based on user's role: planners can't see supervisor tab, and vice versa.
    const navItems = allNavItems.filter(item => !item.role || item.role === userRole);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <img src={kmrlLogo} alt="KMRL Logo" className="h-8 object-contain rounded-lg" />
                    <div>
                        <h1 className="font-display font-bold text-base text-slate-900 leading-none">KMRL Smart Induction</h1>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-semibold uppercase tracking-wider">
                            <Zap className="w-2.5 h-2.5 text-metro-orange" /> {userRole} Environment
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <nav className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                        {navItems.map(item => (
                            <NavLink 
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-nowrap",
                                    isActive ? "bg-white shadow-sm text-metro-blue" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <item.icon className="w-3.5 h-3.5" /> {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User profile & Logout */}
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                        <div className="text-right">
                            <p className="text-xs font-extrabold text-slate-700">kmrl.ops</p>
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider",
                                userRole === 'Planner' ? "bg-emerald-50 text-emerald-600 border border-emerald-150" : "bg-blue-50 text-metro-blue border border-blue-150"
                            )}>
                                {userRole}
                            </span>
                        </div>
                        <button 
                            onClick={() => setUserRole(null)}
                            className="p-2 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-slate-400 cursor-pointer shadow-sm"
                            title="Exit Console"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 max-w-7xl mx-auto w-full flex items-center gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Database Connection Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                {isLoading ? (
                    <div className="col-span-12 flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-metro-blue"></div>
                    </div>
                ) : (
                    <Outlet />
                )}
            </main>
        </div>
    );
};
