import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Train, LayoutDashboard, ShieldCheck, Zap, Lock, User, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

import kmrlLogo from '../kmrl-logo.png';

export const Login = () => {
    const { setUserRole } = useAppContext();
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<'Planner' | 'Supervisor'>('Planner');
    const [username, setUsername] = useState('planner.ops');
    const [password, setPassword] = useState('planner123');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRoleChange = (role: 'Planner' | 'Supervisor') => {
        setSelectedRole(role);
        setError(null);
        if (role === 'Planner') {
            setUsername('planner.ops');
            setPassword('planner123');
        } else {
            setUsername('supervisor.control');
            setPassword('supervisor123');
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Standard validation of authenticating Kochi Metro Rail Operations credentials
        const validCredentials = {
            Planner: {
                username: 'planner.ops',
                password: 'planner123'
            },
            Supervisor: {
                username: 'supervisor.control',
                password: 'supervisor123'
            }
        };

        const targetCreds = validCredentials[selectedRole];

        setTimeout(() => {
            if (username.trim() === targetCreds.username && password === targetCreds.password) {
                setUserRole(selectedRole);
                setLoading(false);
                if (selectedRole === 'Planner') {
                    navigate('/');
                } else {
                    navigate('/supervisor');
                }
            } else {
                setLoading(false);
                setError(`Authentication failed. Correct credentials for ${selectedRole} are: Username '${targetCreds.username}' and Password '${targetCreds.password}'.`);
            }
        }, 800);
    };

    const handleQuickLogin = (role: 'Planner' | 'Supervisor') => {
        setLoading(true);
        setError(null);
        
        const validCredentials = {
            Planner: {
                username: 'planner.ops',
                password: 'planner123'
            },
            Supervisor: {
                username: 'supervisor.control',
                password: 'supervisor123'
            }
        };
        
        const targetCreds = validCredentials[role];
        setSelectedRole(role);
        setUsername(targetCreds.username);
        setPassword(targetCreds.password);

        setTimeout(() => {
            setUserRole(role);
            setLoading(false);
            if (role === 'Planner') {
                navigate('/');
            } else {
                navigate('/supervisor');
            }
        }, 500);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-100/30 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/30 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl overflow-hidden shadow-xl flex flex-col md:flex-row relative z-10">
                
                {/* Left Panel: Kochi Metro Branding */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/20 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/80">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <img src={kmrlLogo} alt="KMRL Logo" className="h-10 object-contain rounded-lg" />
                            <div>
                                <h1 className="font-display font-black text-lg text-slate-800 tracking-tight leading-none">KMRL Smart</h1>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1 mt-1 font-semibold">
                                    <Zap className="w-2.5 h-2.5 animate-pulse text-metro-orange" /> AI Induction Bureau
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h2 className="text-2xl font-display font-black text-slate-800 leading-tight">
                                realOCC Operations Control Center
                            </h2>
                            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                Kochi Metro Rail Limited's unified AI platform. Designed for high-frequency headway synchronization, composition stabling, and Muttom Depot fleet allocation.
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 md:pt-0">
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">System Status</span>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500">Muttom Yard Sync</span>
                                <span className="text-emerald-600 font-black flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> ONLINE
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Role Selector & Login Form */}
                <div className="w-full md:w-7/12 p-8 flex flex-col justify-center space-y-6 bg-white">
                    <div className="space-y-1">
                        <h3 className="text-xl font-display font-black text-slate-800">System Authentication</h3>
                        <p className="text-xs text-slate-400 font-semibold">Select operational role to launch specialized workspace environment</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-2xl flex items-center gap-2.5 leading-relaxed shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Dual Role Selector Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            
                            {/* Planner Card */}
                            <div 
                                onClick={() => handleRoleChange('Planner')}
                                className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group shadow-sm ${
                                    selectedRole === 'Planner' 
                                        ? 'bg-gradient-to-b from-white to-emerald-50/20 border-emerald-500 shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                                        : 'bg-slate-50/40 border-slate-200 hover:border-slate-350'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        selectedRole === 'Planner' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:text-slate-600'
                                    }`}>
                                        <LayoutDashboard className="w-5 h-5" />
                                    </div>
                                    {selectedRole === 'Planner' && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-widest scale-90">
                                            active
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm text-slate-800">Operations Planner</h4>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-snug">Swaps compositions, runs AI diagnostic tests, stabling mileage.</p>
                                </div>
                            </div>

                            {/* Supervisor Card */}
                            <div 
                                onClick={() => handleRoleChange('Supervisor')}
                                className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group shadow-sm ${
                                    selectedRole === 'Supervisor' 
                                        ? 'bg-gradient-to-b from-white to-blue-50/20 border-metro-blue shadow-metro-blue/5 ring-1 ring-metro-blue/20' 
                                        : 'bg-slate-50/40 border-slate-200 hover:border-slate-350'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-xl transition-colors ${
                                        selectedRole === 'Supervisor' ? 'bg-blue-50 text-metro-blue' : 'bg-slate-100 text-slate-500 group-hover:text-slate-600'
                                    }`}>
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    {selectedRole === 'Supervisor' && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-metro-blue border border-blue-200 uppercase tracking-widest scale-90">
                                            active
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm text-slate-800">Control Supervisor</h4>
                                    <p className="text-[10px] text-slate-400 font-semibold leading-snug">Approves plans, dispatches spares, assigns tracks, manages queue.</p>
                                </div>
                            </div>

                        </div>

                        {/* Interactive Preset Buttons (One-Click Demo Entry) */}
                        <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-400 font-bold">Fast Access Workspace:</span>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => handleQuickLogin('Planner')}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/80 transition-all shadow-sm"
                                >
                                    Planner View
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleQuickLogin('Supervisor')}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-metro-blue bg-blue-50 border border-blue-150 hover:bg-blue-100/80 transition-all shadow-sm"
                                >
                                    Supervisor View
                                </button>
                            </div>
                        </div>

                        {/* Credentials input fields (simulated credentials) */}
                        <div className="space-y-3.5 pt-2">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <User className="w-4 h-4" />
                                </span>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-600 focus:outline-none focus:border-metro-blue focus:ring-1 focus:ring-metro-blue/15 transition-all"
                                    placeholder="Username / Station ID"
                                />
                            </div>

                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </span>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-600 focus:outline-none focus:border-metro-blue focus:ring-1 focus:ring-metro-blue/15 transition-all"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        {/* Login Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 ${
                                selectedRole === 'Planner' 
                                    ? 'bg-emerald-500 text-white hover:opacity-90 shadow-emerald-500/10' 
                                    : 'bg-metro-blue text-white hover:opacity-90 shadow-metro-blue/10'
                            }`}
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-b-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Enter Control Console</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};
