import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './src/context/AppContext';
import { Layout } from './src/components/Layout';
import { PlannerDashboard } from './src/pages/PlannerDashboard';
import { SupervisorDashboard } from './src/pages/SupervisorDashboard';
import { DataVisualization } from './src/pages/DataVisualization';
import { ReportingAnalytics } from './src/pages/ReportingAnalytics';
import { MasterData } from './src/pages/MasterData';
import { Login } from './src/pages/Login';
import './index.css';

const App = () => {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<PlannerDashboard />} />
                        <Route path="supervisor" element={<SupervisorDashboard />} />
                        <Route path="analytics" element={<DataVisualization />} />
                        <Route path="reports" element={<ReportingAnalytics />} />
                        <Route path="master-data" element={<MasterData />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
};

createRoot(document.getElementById('root')!).render(<App />);
