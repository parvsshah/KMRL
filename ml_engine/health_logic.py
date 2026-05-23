# Kochi Metro (KMRL) Telemetry Precision Health Logic
# Implements multi-factor rolling stock physics health assessments

def calculate_coach_component_health(brake_mm, panto_force, vibrations, temp_c, door_cycles):
    """
    Computes individual health percentages (0-100) for five key sub-components 
    based on nominal operational boundaries and wear limits.
    """
    # 1. Brake Pad Thickness (Nominal: 15.0mm, Critical Wear Limit: 1.5mm)
    # Wears down to 1.5mm (0% health)
    brake_score = max(0.0, min(100.0, ((brake_mm - 1.5) / (15.0 - 1.5)) * 100.0))
    
    # 2. Pantograph Force (Nominal: 120.0N, Tolerable Deviation: +/- 30.0N [90.0N to 150.0N])
    # Deviation beyond 30N penalizes to 0% health
    panto_score = max(0.0, min(100.0, (1.0 - abs(panto_force - 120.0) / 30.0) * 100.0))
    
    # 3. Cabin Vibrations (Nominal: 0.04g, Extreme Suspension Wear Limit: 0.22g)
    # Values under 0.04g are optimal (100%). Over 0.22g represents failure (0%).
    vib_excess = max(0.0, vibrations - 0.04)
    vib_score = max(0.0, min(100.0, (1.0 - vib_excess / (0.22 - 0.04)) * 100.0))
    
    # 4. Guide Shoe Temperature (Nominal: 42.0°C, Friction/Lubrication Failure Limit: 78.0°C)
    # Temperatures under 42°C are optimal (100%). Over 78°C represents failure (0%).
    temp_excess = max(0.0, temp_c - 42.0)
    temp_score = max(0.0, min(100.0, (1.0 - temp_excess / (78.0 - 42.0)) * 100.0))
    
    # 5. Door Open Cycles (Cumulative cycles since last servicing, threshold: 10,000 cycles)
    # 0 cycles is brand new (100%). Wears down to 0% at 10,000 cycles.
    door_score = max(0.0, min(100.0, (1.0 - door_cycles / 10000.0) * 100.0))
    
    return {
        "brake": round(brake_score, 1),
        "pantograph": round(panto_score, 1),
        "vibration": round(vib_score, 1),
        "temperature": round(temp_score, 1),
        "doors": round(door_score, 1)
    }

def calculate_precision_coach_health(brake_mm, panto_force, vibrations, temp_c, door_cycles):
    """
    Combines sub-component health scores into a weighted overall score, 
    applying safety penalties for any critical failure hotspots.
    """
    scores = calculate_coach_component_health(brake_mm, panto_force, vibrations, temp_c, door_cycles)
    
    # Weights for multi-factor mechanical risk contribution
    weights = {
        "brake": 0.30,        # Critical friction safety
        "temperature": 0.25,  # Guide shoe / axle bearing friction
        "vibration": 0.20,    # Suspension joint and structural wear
        "pantograph": 0.15,   # Electrical power draw friction
        "doors": 0.10         # Actuator wear
    }
    
    # Calculate initial base weighted score
    weighted_sum = sum(scores[key] * weights[key] for key in weights)
    
    # Apply a "Weakest Link" safety penalty multiplier:
    # If any single crucial sub-component drops to critical levels, the overall 
    # safety status of the coach is compromised.
    min_score = min(scores.values())
    penalty = 1.0
    
    if min_score < 20.0:
        penalty = 0.5  # Critical hazard penalty (50% reduction)
    elif min_score < 50.0:
        penalty = 0.8  # Safety warning penalty (20% reduction)
        
    overall_health = weighted_sum * penalty
    
    # Status levels based on safety thresholds
    if min_score < 20.0 or overall_health < 50.0:
        status = "CRITICAL"
    elif min_score < 50.0 or overall_health < 75.0:
        status = "WARNING"
    else:
        status = "OPTIMAL"
        
    return {
        "overall_health": round(overall_health, 1),
        "components": scores,
        "lowest_component": min(scores, key=scores.get),
        "lowest_score": min_score,
        "status": status,
        "penalty_applied": penalty < 1.0
    }

def calculate_trainset_health(coaches_telemetry):
    """
    Calcules compound operational readiness for a full metro trainset 
    using weighted average and absolute weakest link (minimum coach health) penalization.
    
    Formula:
        Trainset Health = 60% (Average Coach Health) + 40% (Minimum Coach Health)
    """
    if not coaches_telemetry:
        return {
            "trainset_health": 0.0,
            "coaches_health": [],
            "average_coach_health": 0.0,
            "minimum_coach_health": 0.0,
            "status": "MAINTENANCE Required"
        }
        
    coaches_results = []
    for c in coaches_telemetry:
        c_id = c.get("id", c.get("coach_id", "Unknown"))
        
        # Extract features with nominal defaults
        brake_mm = float(c.get("brake_pad_thickness_mm", c.get("brake", 15.0)))
        panto_force = float(c.get("pantograph_force_n", c.get("panto_force", 120.0)))
        vibrations = float(c.get("cabin_vibrations_g", c.get("vibrations", 0.04)))
        temp_c = float(c.get("guide_shoe_temp_c", c.get("temp", 42.0)))
        door_cycles = int(c.get("door_cycles", c.get("doors", 0)))
        
        c_health = calculate_precision_coach_health(brake_mm, panto_force, vibrations, temp_c, door_cycles)
        c_health["coach_id"] = c_id
        coaches_results.append(c_health)
        
    overall_scores = [c["overall_health"] for c in coaches_results]
    avg_health = sum(overall_scores) / len(overall_scores)
    min_health = min(overall_scores)
    
    # Compounding calculation to prioritize fleet safety (Minimum health acts as baseline)
    trainset_health = (0.6 * avg_health) + (0.4 * min_health)
    
    # Categorize overall trainset deployment decision
    if min_health < 50.0 or trainset_health < 60.0:
        status = "MAINTENANCE Required"
    elif min_health < 75.0 or trainset_health < 80.0:
        status = "STANDBY / Monitor"
    else:
        status = "Immediate SERVICE"
        
    return {
        "trainset_health": round(trainset_health, 1),
        "coaches_health": coaches_results,
        "average_coach_health": round(avg_health, 1),
        "minimum_coach_health": round(min_health, 1),
        "status": status
    }
