# Kochi Metro (KMRL) Telemetry Coach Health Report Generator
# A premium diagnostic tool demonstrating precision physics and ML health assessments

import sys
import os
import argparse

# Ensure local imports work seamlessly
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from ml_engine.health_logic import calculate_precision_coach_health, calculate_trainset_health

# Theme colors for CLI reporting (ANSI escape codes)
CLR_HEADER = "\033[95m"
CLR_BLUE = "\033[94m"
CLR_CYAN = "\033[96m"
CLR_GREEN = "\033[92m"
CLR_YELLOW = "\033[93m"
CLR_RED = "\033[91m"
CLR_RESET = "\033[0m"
CLR_BOLD = "\033[1m"
CLR_UNDERLINE = "\033[4m"

def get_status_color(status):
    if status == "OPTIMAL" or status == "Immediate SERVICE":
        return CLR_GREEN
    elif status == "WARNING" or status == "STANDBY / Monitor":
        return CLR_YELLOW
    else:
        return CLR_RED

def generate_progress_bar(percentage, length=20):
    """
    Renders a clean, high-fidelity ASCII progress bar.
    """
    filled_len = int(round(length * percentage / 100))
    bar = "█" * filled_len + "░" * (length - filled_len)
    
    if percentage >= 90:
        color = CLR_GREEN
    elif percentage >= 75:
        color = CLR_CYAN
    elif percentage >= 50:
        color = CLR_YELLOW
    else:
        color = CLR_RED
        
    return f"{color}[{bar}]{CLR_RESET} {percentage:>5.1f}%"

def print_coach_report(coach_id, brake_mm, panto_force, vibrations, temp_c, door_cycles):
    """
    Generates and prints a premium, visual telemetry report for a single coach.
    """
    res = calculate_precision_coach_health(brake_mm, panto_force, vibrations, temp_c, door_cycles)
    comps = res["components"]
    status_col = get_status_color(res["status"])
    
    print(f"\n{CLR_BOLD}{CLR_CYAN}┌───────────────────────────────────────────────────────────────────┐{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}│     🚇 KOCHI METRO (KMRL) - INDIVIDUAL COACH HEALTH TELEMETRY     │{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}└───────────────────────────────────────────────────────────────────┘{CLR_RESET}")
    
    print(f"  {CLR_BOLD}Coach Identifier :{CLR_RESET} {CLR_BOLD}{coach_id}{CLR_RESET}")
    print(f"  {CLR_BOLD}Overall Health   :{CLR_RESET} {generate_progress_bar(res['overall_health'])}")
    print(f"  {CLR_BOLD}Safety Status    :{CLR_RESET} {status_col}{CLR_BOLD}{res['status']}{CLR_RESET}")
    
    if res["penalty_applied"]:
        print(f"  {CLR_RED}⚠️  WEAKEST LINK SAFETY PENALTY ACTIVE (Multiplier: 0.5x or 0.8x){CLR_RESET}")
        
    print(f"\n  {CLR_BOLD}{CLR_UNDERLINE}SCADA Telemetry Component Breakdown:{CLR_RESET}")
    
    # 1. Brake Pads
    print(f"  - Brake Pad Wear  : {generate_progress_bar(comps['brake'])}  ({brake_mm:.1f} mm / 15.0)")
    # 2. Pantograph Force
    print(f"  - Panto Force     : {generate_progress_bar(comps['pantograph'])}  ({panto_force:.1f} N / 120.0)")
    # 3. Cabin Vibrations
    print(f"  - Suspension Vib  : {generate_progress_bar(comps['vibration'])}  ({vibrations:.3f} g / 0.04)")
    # 4. Guide Shoe Temp
    print(f"  - Guide Shoe Temp : {generate_progress_bar(comps['temperature'])}  ({temp_c:.1f} °C / 42.0)")
    # 5. Door Cycles
    print(f"  - Door Gear Cycles: {generate_progress_bar(comps['doors'])}  ({door_cycles:,} cycles / 10,000)")
    
    print(f"\n  {CLR_BOLD}Lowest Scoring component:{CLR_RESET} {CLR_YELLOW}'{res['lowest_component']}'{CLR_RESET} ({res['lowest_score']:.1f}%)")
    print(f"{CLR_BOLD}{CLR_CYAN}└───────────────────────────────────────────────────────────────────┘{CLR_RESET}\n")

def print_trainset_report(trainset_id, coaches_telemetry):
    """
    Generates and prints a compound operational readiness report for a full trainset.
    """
    res = calculate_trainset_health(coaches_telemetry)
    status_col = get_status_color(res["status"])
    
    print(f"\n{CLR_BOLD}{CLR_HEADER}┌───────────────────────────────────────────────────────────────────┐{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_HEADER}│       🚇 KOCHI METRO (KMRL) - FLEET TRAINSET INDUCTION REPORT     │{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_HEADER}└───────────────────────────────────────────────────────────────────┘{CLR_RESET}")
    
    print(f"  {CLR_BOLD}Trainset ID      :{CLR_RESET} {CLR_BOLD}{trainset_id}{CLR_RESET}")
    print(f"  {CLR_BOLD}Compound Health  :{CLR_RESET} {generate_progress_bar(res['trainset_health'])}")
    print(f"  {CLR_BOLD}Deployment Auth  :{CLR_RESET} {status_col}{CLR_BOLD}{res['status']}{CLR_RESET}")
    
    print(f"\n  {CLR_BOLD}{CLR_UNDERLINE}Coach Assessment Breakdown:{CLR_RESET}")
    print(f"  Average Coach Health Score: {res['average_coach_health']}%")
    print(f"  Minimum Coach Health Score: {res['minimum_coach_health']}%")
    
    print(f"\n  {CLR_BOLD}Constituent Coaches:{CLR_RESET}")
    for idx, c in enumerate(res["coaches_health"]):
        c_status_col = get_status_color(c["status"])
        print(f"    {idx+1}. {CLR_BOLD}{c['coach_id']}{CLR_RESET} - Health: {generate_progress_bar(c['overall_health'])} | Status: {c_status_col}{c['status']}{CLR_RESET}")
        
    print(f"{CLR_BOLD}{CLR_HEADER}└───────────────────────────────────────────────────────────────────┘{CLR_RESET}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kochi Metro (KMRL) SCADA Telemetry Health Report")
    parser.add_argument("--coach", type=str, help="Coach ID to analyze")
    parser.add_argument("--brake", type=float, help="Brake pad thickness (mm)")
    parser.add_argument("--panto", type=float, help="Pantograph contact force (N)")
    parser.add_argument("--vib", type=float, help="Cabin vibrations (g)")
    parser.add_argument("--temp", type=float, help="Guide shoe temperature (°C)")
    parser.add_argument("--doors", type=int, help="Door open cycles since last service")
    
    args = parser.parse_args()
    
    # If explicit arguments are provided, generate a report for that specific coach
    if args.coach and all(v is not None for v in [args.brake, args.panto, args.vib, args.temp, args.doors]):
        print_coach_report(args.coach, args.brake, args.panto, args.vib, args.temp, args.doors)
    else:
        # Otherwise, run diagnostic suite demonstrating various health profiles (optimal, warning, critical)
        print(f"{CLR_BOLD}{CLR_GREEN}Running KMRL Fleet Diagnostic Report Suite...{CLR_RESET}")
        
        # 1. Optimal Coach
        print_coach_report("DMC1-01 (Optimal Unit)", 14.5, 118.5, 0.042, 43.5, 350)
        
        # 2. Warning / Degraded Coach
        print_coach_report("TC-02 (Degraded/Wear Warning)", 8.5, 102.0, 0.120, 62.0, 5200)
        
        # 3. Critical Safety Penalty Coach (Only brake is bad, triggers penalty)
        print_coach_report("DMC2-03 (Critical Wear Hazard)", 1.7, 120.0, 0.040, 42.0, 0)
        
        # 4. Trainset Aggregation Report
        trainset_coaches = [
            {"id": "DMC1-09", "brake": 14.5, "panto_force": 118.5, "vibrations": 0.042, "temp": 43.5, "doors": 350},
            {"id": "TC-09", "brake": 8.5, "panto_force": 102.0, "vibrations": 0.120, "temp": 62.0, "doors": 5200},
            {"id": "DMC2-09", "brake": 1.7, "panto_force": 120.0, "vibrations": 0.040, "temp": 42.0, "doors": 0}
        ]
        print_trainset_report("KM09 (Representative Trainset)", trainset_coaches)
