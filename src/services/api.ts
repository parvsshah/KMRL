import { ReportData, FormData, CoachInstance } from '../types';

export const analyzeInductionReadiness = async (
    formData: FormData,
    coaches: CoachInstance[]
): Promise<ReportData> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const selectedDetails = formData.selectedCoaches.map(id => coaches.find(c => c.id === id)).filter(Boolean) as CoachInstance[];
    
    if (selectedDetails.length === 0) {
        throw new Error("No valid coaches selected.");
    }

    const avgHealth = selectedDetails.reduce((acc, c) => acc + (c.health || 0), 0) / selectedDetails.length;

    // KMRL specific logic simulation
    const scoreFitness = avgHealth > 90 ? 5 : avgHealth > 80 ? 4 : 2;
    const scoreJobCard = 5; // Assuming closed for standby units
    const scoreBranding = Math.floor(Math.random() * 3) + 3; // 3-5
    const scoreMileage = formData.mileageKm < 1000 ? 5 : formData.mileageKm < 3000 ? 4 : 2;
    
    // Check if any unit needs cleaning
    const needsCleaning = selectedDetails.some(c => c.maintenanceStatus === 'Cleaning Req');
    const scoreCleaning = needsCleaning ? 2 : 5;
    const scoreStabling = 5; // Optimal stabling at Muttom Yard
    
    const totalScore = scoreFitness + scoreJobCard + scoreBranding + scoreMileage + scoreCleaning + scoreStabling;
    const decision = totalScore >= 25 ? "Immediate SERVICE" : totalScore >= 18 ? "STANDBY" : "MAINTENANCE Required";

    const summary = `Simulated Analysis for KMRL Route Deployment: Trainset ${formData.trainsetId} demonstrates an average health of ${avgHealth.toFixed(1)}%. ${
        decision === 'Immediate SERVICE' 
            ? 'Fully cleared for mainline passenger service along Aluva - SN Junction.' 
            : decision === 'STANDBY' 
                ? 'Cleared for secondary duties or short-loop trips. Requires monitoring.' 
                : 'Fails induction criteria. Divert to Muttom Yard maintenance bay immediately.'
    }`;

    return {
        Trainset_ID: formData.trainsetId,
        Readiness_Score: totalScore,
        Induction_Decision: decision,
        Strategic_Summary: summary,
        Grades: {
            Fitness: scoreFitness,
            JobCard: scoreJobCard,
            Branding: scoreBranding,
            Mileage: scoreMileage,
            Cleaning: scoreCleaning,
            Stabling: scoreStabling
        },
        Telemetry: {
            Current_Mileage_KM: formData.mileageKm
        }
    };
};
