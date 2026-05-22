import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SCADAMetrics } from './types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getSCADAMetrics(cId: string): SCADAMetrics {
    const num = parseInt(cId.replace(/[^0-9]/g, '')) || 100;
    return {
        brakePad: ((num % 5) + 3.2).toFixed(1) + " mm",
        pantoForce: ((num % 30) + 75) + " N",
        vibrations: ((num % 10) / 100 + 0.02).toFixed(2) + " g",
        shoeTemp: ((num % 15) + 38) + " °C",
        doorCycles: (((num * 120) % 10000) + 12000).toLocaleString()
    };
}

