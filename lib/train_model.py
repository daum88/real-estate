"""AVM v4 — Log transform, POI features, NaN amenities, transaction adjustment"""
import json, os, numpy as np, xgboost as xgb
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_percentage_error

FEATURES = [
    'area', 'rooms', 'year', 'age',
    'floorRatio', 'energyNum',
    'lat', 'lon',
    'matStone', 'matWood', 'matPanel',
    'isNew',
    'comp_avg_price_sqm_1km', 'comp_count_1km',
    'dist_school_km', 'dist_transit_km',
    'hasBalcony', 'hasSauna', 'hasParking', 'hasStorage',
]

def load_data():
    p = os.path.join(os.path.dirname(__file__), '..', 'data', 'all_listings.json')
    with open(p) as f: data = json.load(f)
    listings = data.get('listings', [])
    
    apts = [l for l in listings 
            if not (l.get('id','') or '').startswith('kvh_')
            and l.get('priceEur',0) > 5000 and l.get('priceEur',0) < 2000000
            and l.get('area',0) > 10]
    
    X, y_raw = [], []
    for l in apts:
        feats = []
        for k in FEATURES:
            v = l.get(k)
            # Handle NaN for amenities (missing = unknown)
            if k.startswith('has') and v is None:
                feats.append(np.nan)
            elif k in ('energyNum','age','floorRatio') and v is None:
                feats.append(np.nan)
            elif k == 'year' and (v is None or v < 1800):
                feats.append(float(2000))
            else:
                feats.append(float(v or 0))
        X.append(feats)
        y_raw.append(l['priceEur'] / l['area'])
    
    return np.array(X), np.array(y_raw), apts

def main():
    X, y_raw, apts = load_data()
    print(f"Entries: {len(apts)}")
    
    # Log transform target
    y_log = np.log1p(y_raw)  # ln(1 + price/m²)
    
    # Remove rows with too many NaN in key features
    nan_counts = np.isnan(X).sum(axis=1)
    valid = nan_counts < 6  # Allow up to 5 NaN features
    X, y_log, y_raw = X[valid], y_log[valid], y_raw[valid]
    print(f"Valid after NaN filter: {len(y_raw)}")
    
    # 5-fold CV
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    mapes_pred, mapes_comp = [], []
    
    for ti, vi in kf.split(X):
        Xt, Xv = X[ti], X[vi]
        yt_log, yv_log = y_log[ti], y_log[vi]
        yv_raw = y_raw[vi]
        
        model = xgb.XGBRegressor(
            objective='reg:squarederror',  # MAE-like on log scale
            learning_rate=0.05, max_depth=7,
            subsample=0.8, colsample_bytree=0.8,
            n_estimators=1200, random_state=42,
            missing=np.nan,  # Native NaN handling
        )
        model.fit(Xt, yt_log, verbose=False)
        
        # Predict log, then exp to get price/m²
        pred_log = model.predict(Xv)
        pred_raw = np.expm1(pred_log)  # exp(pred) - 1
        
        # Total price error
        areas = Xv[:, 0]
        pred_total = pred_raw * areas
        actual_total = yv_raw * areas
        mapes_pred.append(mean_absolute_percentage_error(actual_total, pred_total) * 100)
        
        # Simple baseline: use listing's own price/m² (not a real model, just reference)
        # Without spatial features, use median as baseline
        comp_pred = np.full(len(actual_total), np.median(yv_raw)) * areas
        mapes_comp.append(mean_absolute_percentage_error(actual_total, comp_pred) * 100)
    
    print(f"\n=== Results ===")
    print(f"XGBoost v4 (log+NaN+POI): MAPE={np.mean(mapes_pred):.1f}% (±{np.std(mapes_pred):.1f})")
    print(f"Comp-avg baseline:        MAPE={np.mean(mapes_comp):.1f}% (±{np.std(mapes_comp):.1f})")
    improvement = (1 - np.mean(mapes_pred)/np.mean(mapes_comp)) * 100
    print(f"Improvement: {improvement:.0f}%")
    
    # Train final model
    final = xgb.XGBRegressor(
        objective='reg:squarederror', learning_rate=0.05, max_depth=7,
        subsample=0.8, colsample_bytree=0.8, n_estimators=1200,
        random_state=42, missing=np.nan,
    )
    final.fit(X, y_log, verbose=False)
    
    model_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'models')
    os.makedirs(model_dir, exist_ok=True)
    final.save_model(os.path.join(model_dir, 'avm_v4.json'))
    print(f"Saved avm_v4.json")
    
    # Feature importance
    imp = final.get_booster().get_score(importance_type='gain')
    top = sorted(imp.items(), key=lambda x: x[1], reverse=True)[:10]
    print("\nTop 10 features:")
    for k, v in top:
        idx = int(k.replace('f', ''))
        print(f"  {FEATURES[idx]}: {v:.0f}")

    # Calculate transaction adjustment
    # Maa-amet ratios: asking ~5-10% above transaction
    # Apply conservative 5% adjustment
    adj_factor = 0.95  # Asking * 0.95 ≈ transaction price
    print(f"\nTransaction adjustment: {adj_factor} (5% asking→sale discount)")
    print(f"Example: €150k asking → €{150000*adj_factor:,.0f} estimated transaction")

if __name__ == '__main__':
    main()
