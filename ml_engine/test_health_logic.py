# Automated Unit Tests for Kochi Metro (KMRL) Telemetry Health Logic
import sys
import os

# Adjust paths to import health_logic correctly
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from ml_engine.health_logic import (
    calculate_coach_component_health,
    calculate_precision_coach_health,
    calculate_trainset_health
)

def run_tests():
    print("========================================")
    print("🛠️  KMRL PRECISION HEALTH LOGIC DIAGNOSTICS")
    print("========================================\n")
    
    # ----------------------------------------------------
    # TEST 1: Nominal Optimal Coach Telemetry
    # ----------------------------------------------------
    print("Test 1: Assessment of Nominal Optimal Coach Telemetry...")
    nominal_result = calculate_precision_coach_health(
        brake_mm=15.0,
        panto_force=120.0,
        vibrations=0.04,
        temp_c=42.0,
        door_cycles=0
    )
    print(f"  Overall Health: {nominal_result['overall_health']}%")
    print(f"  Status: {nominal_result['status']}")
    print(f"  Components Breakdowns: {nominal_result['components']}")
    assert nominal_result["overall_health"] == 100.0, "Nominal optimal inputs should yield exactly 100% health!"
    assert nominal_result["status"] == "OPTIMAL", "Nominal optimal status should be OPTIMAL"
    print("  ✅ Passed!\n")
    
    # ----------------------------------------------------
    # TEST 2: Mid-Wear Warning Coach Telemetry (e.g. brake pad down to 6.0mm)
    # ----------------------------------------------------
    print("Test 2: Assessment of Degraded Coach Telemetry (Warning Boundary)...")
    warning_result = calculate_precision_coach_health(
        brake_mm=6.0,       # Significant wear
        panto_force=115.0,  # Slight deviation
        vibrations=0.10,    # Noticeable vibration increase
        temp_c=58.0,        # Moderate temp increase
        door_cycles=4000    # Moderate door operations
    )
    print(f"  Overall Health: {warning_result['overall_health']}%")
    print(f"  Lowest Component: '{warning_result['lowest_component']}' with score {warning_result['lowest_score']}%")
    print(f"  Status: {warning_result['status']}")
    print(f"  Penalty Applied: {warning_result['penalty_applied']}")
    assert warning_result["status"] in ["WARNING", "CRITICAL"], "Should trigger warning/critical threshold."
    print("  ✅ Passed!\n")
    
    # ----------------------------------------------------
    # TEST 3: Extreme Safety Penalty Activation
    # ----------------------------------------------------
    print("Test 3: Verification of Safety Penalty Activation (Weakest Link Rule)...")
    # Low brake pad (1.6mm) which is close to the critical 1.5mm limit
    critical_result = calculate_precision_coach_health(
        brake_mm=1.6,       # Dangerously thin! (Under 20% health component)
        panto_force=120.0,  # All other sensors optimal
        vibrations=0.04,
        temp_c=42.0,
        door_cycles=0
    )
    print(f"  Base Weighted Sum would be high since only brakes are bad.")
    print(f"  Overall Health with penalty: {critical_result['overall_health']}%")
    print(f"  Lowest Component: '{critical_result['lowest_component']}' with score {critical_result['lowest_score']}%")
    print(f"  Status: {critical_result['status']}")
    print(f"  Penalty Applied: {critical_result['penalty_applied']}")
    assert critical_result["penalty_applied"] is True, "Critical wear should trigger safety penalty reduction!"
    assert critical_result["status"] == "CRITICAL", "Status should be CRITICAL"
    print("  ✅ Passed!\n")
    
    # ----------------------------------------------------
    # TEST 4: Aggregated Trainset Compounding Health
    # ----------------------------------------------------
    print("Test 4: Aggregated Trainset Compound Safety Evaluation...")
    coaches_telemetry = [
        # DMC1: High health
        {"id": "DMC1-01", "brake_pad_thickness_mm": 14.2, "pantograph_force_n": 121.0, "cabin_vibrations_g": 0.05, "guide_shoe_temp_c": 44.0, "door_cycles": 200},
        # TC: Optimal health
        {"id": "TC-01", "brake_pad_thickness_mm": 15.0, "pantograph_force_n": 120.0, "cabin_vibrations_g": 0.04, "guide_shoe_temp_c": 42.0, "door_cycles": 100},
        # DMC2: Extremely degraded and critical
        {"id": "DMC2-01", "brake_pad_thickness_mm": 1.6, "pantograph_force_n": 120.0, "cabin_vibrations_g": 0.04, "guide_shoe_temp_c": 42.0, "door_cycles": 0}
    ]
    trainset_result = calculate_trainset_health(coaches_telemetry)
    print(f"  Average Coach Health Score: {trainset_result['average_coach_health']}%")
    print(f"  Minimum Coach Health Score: {trainset_result['minimum_coach_health']}%")
    print(f"  Compound Trainset Health Score: {trainset_result['trainset_health']}%")
    print(f"  Aggregated Status: {trainset_result['status']}")
    
    # Check that compound health is lower than average due to 40% weighting on minimum (DMC2-01)
    assert trainset_result["trainset_health"] < trainset_result["average_coach_health"], "Trainset health must be penalized by the minimum coach health!"
    assert trainset_result["status"] == "MAINTENANCE Required", "Failing coach must flag whole trainset for maintenance!"
    print("  ✅ Passed!\n")
    
    print("🎉 All precision health tests executed successfully! Mathematical accuracy verified.")

if __name__ == "__main__":
    run_tests()
