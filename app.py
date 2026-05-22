import os
import sys
import subprocess

# Ensure Flask and Flask-CORS are installed
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("Flask and/or Flask-CORS not found. Automatically installing dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "flask-cors"])
    from flask import Flask, request, jsonify
    from flask_cors import CORS

# Add parent directory and ml_engine directory to path so ml_engine is fully importable
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)
sys.path.append(os.path.join(base_dir, "ml_engine"))

# Import machine learning pipeline wrappers
try:
    from ml_engine.predict import predict_maintenance_need, load_predictive_models
    from ml_engine.train import train_predictive_models
    from ml_engine.data_generator import generate_synthetic_kmrl_telemetry
except ImportError as e:
    print(f"Import Error: {e}. Ensuring path structure holds...")

app = Flask(__name__)
# Enable CORS for frontend applications (Vite default is port 5173 or other origins)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Returns API operational status and checks if serialized model binaries exist.
    """
    ml_dir = os.path.join(base_dir, "ml_engine", "models")
    regressor_exists = os.path.exists(os.path.join(ml_dir, "rul_regressor_model.pkl"))
    classifier_exists = os.path.exists(os.path.join(ml_dir, "urgency_classifier_model.pkl"))
    
    return jsonify({
        "status": "OPERATIONAL",
        "service": "KMRL Smart Induction Controller & Telemetry backend",
        "models": {
            "rul_regressor": "LOADED" if regressor_exists else "MISSING",
            "urgency_classifier": "LOADED" if classifier_exists else "MISSING"
        },
        "python_version": sys.version,
        "available_endpoints": [
            "GET  /api/health",
            "POST /api/predict",
            "POST /api/predict/fleet",
            "POST /api/train",
            "POST /api/generate-data"
        ]
    }), 200

@app.route("/api/predict", methods=["POST"])
def predict_telemetry():
    """
    Post metrics for a single coach to receive RUL and maintenance priority.
    Expected JSON schema:
    {
        "brake_pad_thickness_mm": 4.2,
        "pantograph_force_n": 102.0,
        "cabin_vibrations_g": 0.14,
        "guide_shoe_temp_c": 68.0,
        "door_cycles": 5400
    }
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # Extract inputs with defaults or type conversions
        try:
            brake_mm = float(data.get("brake_pad_thickness_mm", 15.0))
            panto_force = float(data.get("pantograph_force_n", 120.0))
            vibrations = float(data.get("cabin_vibrations_g", 0.04))
            temp_c = float(data.get("guide_shoe_temp_c", 42.0))
            doors = int(data.get("door_cycles", 0))
        except (ValueError, TypeError) as e:
            return jsonify({
                "status": "ERROR",
                "message": f"Invalid data types in JSON fields: {str(e)}"
            }), 400

        # Execute dynamic ML inference
        diagnostics = predict_maintenance_need(
            brake_mm=brake_mm,
            panto_force=panto_force,
            vibrations=vibrations,
            temp_c=temp_c,
            doors=doors
        )
        
        return jsonify({
            "status": "SUCCESS",
            "inputs": {
                "brake_pad_thickness_mm": brake_mm,
                "pantograph_force_n": panto_force,
                "cabin_vibrations_g": vibrations,
                "guide_shoe_temp_c": temp_c,
                "door_cycles": doors
            },
            "predictions": diagnostics
        }), 200

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "message": f"Inference pipeline failure: {str(e)}"
        }), 500

@app.route("/api/predict/fleet", methods=["POST"])
def predict_fleet():
    """
    Assess multiple coaches in batch to output predictive health insights and sorting.
    Expected JSON schema is an array of coach objects:
    [
        {"id": "DMC1-01", "brake_pad_thickness_mm": 12.0, ...},
        ...
    ]
    """
    try:
        coaches_list = request.get_json(silent=True)
        if not isinstance(coaches_list, list):
            return jsonify({
                "status": "ERROR",
                "message": "Expected a JSON list containing coach telemetry models."
            }), 400

        results = []
        for c in coaches_list:
            coach_id = c.get("id", "Unknown")
            
            # Map frontend names or typical fields to model features with sensible defaults
            # (Nominal defaults derived from kmrl data_generator)
            brake_mm = float(c.get("brake_pad_thickness_mm", c.get("brake", 15.0)))
            panto_force = float(c.get("pantograph_force_n", c.get("panto_force", 120.0)))
            vibrations = float(c.get("cabin_vibrations_g", c.get("vibrations", 0.04)))
            temp_c = float(c.get("guide_shoe_temp_c", c.get("temp", 42.0)))
            doors = int(c.get("door_cycles", c.get("doors", 0)))

            diagnostics = predict_maintenance_need(
                brake_mm=brake_mm,
                panto_force=panto_force,
                vibrations=vibrations,
                temp_c=temp_c,
                doors=doors
            )

            results.append({
                "coach_id": coach_id,
                "metrics": {
                    "brake_pad_thickness_mm": brake_mm,
                    "pantograph_force_n": panto_force,
                    "cabin_vibrations_g": vibrations,
                    "guide_shoe_temp_c": temp_c,
                    "door_cycles": doors
                },
                "analysis": diagnostics
            })

        # Sort fleet by operational urgency (IMMINENT first, then DUE SOON, then OPTIMAL)
        urgency_order = {"IMMINENT": 0, "DUE SOON": 1, "OPTIMAL": 2}
        results.sort(key=lambda x: urgency_order.get(x["analysis"]["maintenance_urgency"], 3))

        return jsonify({
            "status": "SUCCESS",
            "fleet_size": len(results),
            "diagnostics": results
        }), 200

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "message": f"Fleet wear assessment failure: {str(e)}"
        }), 500

@app.route("/api/train", methods=["POST"])
def trigger_retraining():
    """
    Triggers dynamic Scikit-Learn RandomForest model fitting.
    Re-evaluates feature importances, R2 and RMSE metrics and saves updated artifacts.
    """
    try:
        # Redirect print statements to capture training metrics console logs
        import io
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()

        try:
            train_predictive_models()
        finally:
            sys.stdout = old_stdout
            
        logs_output = buffer.getvalue()

        # Check model files status to confirm saving
        ml_dir = os.path.join(base_dir, "ml_engine", "models")
        regressor_exists = os.path.exists(os.path.join(ml_dir, "rul_regressor_model.pkl"))
        classifier_exists = os.path.exists(os.path.join(ml_dir, "urgency_classifier_model.pkl"))

        return jsonify({
            "status": "SUCCESS",
            "message": "Models successfully retrained and serialized.",
            "regressor_status": "UPDATED" if regressor_exists else "MISSING",
            "classifier_status": "UPDATED" if classifier_exists else "MISSING",
            "console_logs": logs_output
        }), 200

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "message": f"Training pipeline failed: {str(e)}"
        }), 500

@app.route("/api/generate-data", methods=["POST"])
def trigger_data_generation():
    """
    Triggers historical CSV simulation logs creation.
    """
    try:
        data = request.get_json(silent=True) or {}
        num_records = int(data.get("num_records", 1500))

        df = generate_synthetic_kmrl_telemetry(num_records=num_records)

        return jsonify({
            "status": "SUCCESS",
            "message": f"Simulated {num_records} telemetry rows.",
            "columns": list(df.columns),
            "sample": df.head(3).to_dict(orient="records")
        }), 200

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "message": f"Telemetry generation pipeline failure: {str(e)}"
        }), 500

if __name__ == "__main__":
    # Start on standard port 5001 to prevent conflicts with Supabase or frontend Vite (5173)
    # Expose to localhost and enable developer hot-reloading
    print("🚇 Starting Kochi Metro (KMRL) SCADA ML Engine Backend API...")
    app.run(host="127.0.0.1", port=5001, debug=True)
