import joblib
import pandas as pd
import numpy as np
import os
import sys

def load_predictive_models():
    """
    Loads serialized predictive maintenance models from disk.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    regressor_path = os.path.join(base_dir, "models", "rul_regressor_model.pkl")
    classifier_path = os.path.join(base_dir, "models", "urgency_classifier_model.pkl")
    
    if not os.path.exists(regressor_path) or not os.path.exists(classifier_path):
        # Let's try training models automatically if they are missing
        print("Serialized model files not found. Attempting to train models first...")
        from ml_engine.train import train_predictive_models
        train_predictive_models()
        
    if not os.path.exists(regressor_path) or not os.path.exists(classifier_path):
        print("Serialized model files not found even after training attempt. Please run 'python train.py' first.")
        sys.exit(1)
        
    regressor = joblib.load(regressor_path)
    classifier = joblib.load(classifier_path)
    
    return regressor, classifier

def predict_maintenance_need(brake_mm, panto_force, vibrations, temp_c, doors):
    """
    Predicts Remaining Useful Life (RUL) and maintenance status badge.
    """
    regressor, classifier = load_predictive_models()
    
    # Pre-populate prediction sample
    input_data = pd.DataFrame([{
        "brake_pad_thickness_mm": brake_mm,
        "pantograph_force_n": panto_force,
        "cabin_vibrations_g": vibrations,
        "guide_shoe_temp_c": temp_c,
        "door_cycles": doors
    }])
    
    # Execute predictions
    predicted_rul = regressor.predict(input_data)[0]
    predicted_status = classifier.predict(input_data)[0]
    
    return {
        "remaining_useful_life_km": round(predicted_rul, 1),
        "maintenance_urgency": predicted_status,
        "action_required": "SCHEDULE IMMEDIATELY" if predicted_status == "IMMINENT" 
                           else "MONITOR CLOSELY" if predicted_status == "DUE SOON" 
                           else "NO ACTION REQUIRED"
    }

if __name__ == "__main__":
    print("--- Kochi Metro ML Predictive Telemetry Engine ---\n")
    
    # 1. Run a sample test prediction
    print("Running diagnostic evaluation on wear sample:")
    print("  Inputs: Brake=4.2mm, PantoForce=102N, Vib=0.14g, Temp=68°C, Doors=5400 cycles")
    
    try:
        diagnostics = predict_maintenance_need(
            brake_mm=4.2,
            panto_force=102.0,
            vibrations=0.140,
            temp_c=68.0,
            doors=5400
        )
        
        print("\nDiagnostic Results:")
        print(f"  Predicted Remaining Useful Life : {diagnostics['remaining_useful_life_km']:,} KM")
        print(f"  Urgency Classification          : {diagnostics['maintenance_urgency']}")
        print(f"  Operations Recommendation       : {diagnostics['action_required']}")
        
    except SystemExit:
        pass
    except Exception as e:
        print(f"Error executing prediction diagnostics: {e}")
        print("Please train models first by executing: python train.py")
