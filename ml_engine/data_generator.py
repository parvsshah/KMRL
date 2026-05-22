import pandas as pd
import numpy as np
import os

def generate_synthetic_kmrl_telemetry(num_records=1500, random_seed=42):
    """
    Generates a high-fidelity dataset simulating SCADA telemetry and operational wear 
    for Kochi Metro (KMRL) coach elements across the 25 active trainsets.
    """
    np.random.seed(random_seed)
    
    data = []
    
    # KMRL Trainset fleet: KM01 to KM25
    trainset_ids = [f"KM{str(i).zfill(2)}" for i in range(1, 26)]
    
    for i in range(num_records):
        trainset = np.random.choice(trainset_ids)
        
        # Base mileage (highly correlated with wear and tear)
        mileage = np.random.uniform(500, 28000)
        
        # Calculate wear cycles based on mileage modulo checkup intervals (5,000 km)
        distance_since_last_check = mileage % 5000
        
        # 1. Brake Pad Thickness (mm) - Nominal: 15mm. Wears down to 2mm trigger.
        base_brake_wear = (distance_since_last_check / 5000) * 12.0
        brake_pad_thickness = max(1.5, 15.0 - base_brake_wear - np.random.normal(0, 0.4))
        
        # 2. Pantograph Contact Force (Newtons) - Target: 120 N. Suspension fatigue causes drops or spikes.
        pantograph_force = 120.0 - (distance_since_last_check / 5000) * 25.0 + np.random.normal(0, 4.0)
        
        # 3. Cabin Vibrations (g-force) - Nominal: 0.04g. Suspension wear increases vibrations.
        vibration_increase = (distance_since_last_check / 5000) * 0.18
        vibrations = max(0.02, 0.04 + vibration_increase + np.random.normal(0, 0.015))
        
        # 4. Guide Shoe Temperature (°C) - Nominal: 42°C. High wear/friction raises it to 75°C.
        temp_increase = (distance_since_last_check / 5000) * 28.0
        temperature = 42.0 + temp_increase + np.random.normal(0, 2.5)
        
        # 5. Door Open Cycles (cumulative cycles since last depot service)
        door_cycles = int(distance_since_last_check * 1.8 + np.random.normal(0, 50))
        door_cycles = max(0, door_cycles)
        
        # Target label: Remaining Useful Life (RUL) in Kilometers
        # RUL drops as distance since last check increases towards 5000 km
        rul_km = max(0.0, 5000.0 - distance_since_last_check)
        
        # Target label: Categorical Maintenance Urgency Status
        if rul_km > 1500:
            status = "OPTIMAL"
        elif rul_km > 500:
            status = "DUE SOON"
        else:
            status = "IMMINENT"
            
        data.append({
            "trainset_id": trainset,
            "mileage_km": round(mileage, 1),
            "brake_pad_thickness_mm": round(brake_pad_thickness, 2),
            "pantograph_force_n": round(pantograph_force, 2),
            "cabin_vibrations_g": round(vibrations, 3),
            "guide_shoe_temp_c": round(temperature, 1),
            "door_cycles": door_cycles,
            "rul_km": round(rul_km, 1),
            "maintenance_status": status
        })
        
    df = pd.DataFrame(data)
    
    # Save to data directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, "kmrl_telemetry_historical.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated {num_records} telemetry records saved to '{csv_path}'.")
    return df

if __name__ == "__main__":
    generate_synthetic_kmrl_telemetry()
