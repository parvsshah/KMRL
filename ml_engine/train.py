import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
import joblib
import os
from data_generator import generate_synthetic_kmrl_telemetry

def train_predictive_models():
    # 1. Ensure dataset exists
    csv_path = "data/kmrl_telemetry_historical.csv"
    if not os.path.exists(csv_path):
        print("Dataset not found. Generating fresh synthetic telemetry logs...")
        df = generate_synthetic_kmrl_telemetry()
    else:
        df = pd.read_csv(csv_path)
        
    print("\nSuccessfully loaded training dataset.")
    print(df.head())
    
    # 2. Extract features and targets
    features = [
        "brake_pad_thickness_mm", 
        "pantograph_force_n", 
        "cabin_vibrations_g", 
        "guide_shoe_temp_c", 
        "door_cycles"
    ]
    
    X = df[features]
    y_reg = df["rul_km"]
    y_clf = df["maintenance_status"]
    
    # 3. Split into Train & Test sets
    X_train, X_test, y_reg_train, y_reg_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    _, _, y_clf_train, y_clf_test = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    
    # --- MODEL 1: RUL REGRESSOR ---
    print("\n--- Training RUL Regressor (Predict remaining KMs to failure) ---")
    regressor = RandomForestRegressor(n_estimators=100, random_state=42)
    regressor.fit(X_train, y_reg_train)
    
    # Evaluate regressor
    y_reg_pred = regressor.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_reg_test, y_reg_pred))
    r2 = r2_score(y_reg_test, y_reg_pred)
    print(f"RUL Regression Accuracy:")
    print(f"  Root Mean Squared Error (RMSE): {rmse:.2f} KM")
    print(f"  Coefficient of Determination (R2 Score): {r2:.4f}")
    
    # --- MODEL 2: STATUS CLASSIFIER ---
    print("\n--- Training Maintenance Urgency Classifier ---")
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X_train, y_clf_train)
    
    # Evaluate classifier
    y_clf_pred = classifier.predict(X_test)
    accuracy = accuracy_score(y_clf_test, y_clf_pred)
    print(f"Urgency Classifier Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_clf_test, y_clf_pred))
    
    # 4. Feature Importances
    print("\nFeature Importances (RUL Model):")
    importances = regressor.feature_importances_
    for name, imp in zip(features, importances):
        print(f"  {name:25s}: {imp * 100:.2f}%")
        
    # 5. Serialize / Save Models
    os.makedirs("models", exist_ok=True)
    joblib.dump(regressor, "models/rul_regressor_model.pkl")
    joblib.dump(classifier, "models/urgency_classifier_model.pkl")
    print("\nModels successfully serialized and saved to 'models/' directory.")

if __name__ == "__main__":
    # Workaround for train_test_split keyword arg compatibility across sklearn versions
    # Set random seed directly
    import random
    random.seed(42)
    np.random.seed(42)
    
    # Local imports or functions
    train_predictive_models()
