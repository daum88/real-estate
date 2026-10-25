/**
 * Pure JavaScript XGBoost model evaluator
 * Loads model from JSON, predicts price/m² from feature vector
 */
const fs = require('fs');
const path = require('path');

// Load model from JSON
function loadModel(modelPath) {
  try {
    return JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
  } catch { return null; }
}

// Evaluate all trees in the ensemble (array-based format)
function predict(model, features) {
  const trees = model.learner?.gradient_booster?.model?.trees;
  if (!trees?.length) return null;
  
  const baseScore = parseFloat(model.learner?.learner_model_param?.base_score || '0.5');
  let sum = baseScore;
  
  for (const tree of trees) {
    let nodeId = 0;
    while (true) {
      // Check if leaf (no left child)
      if (tree.left_children[nodeId] === -1) {
        sum += tree.base_weights[nodeId];
        break;
      }
      // Internal node: compare feature
      const featIdx = tree.split_indices[nodeId];
      const threshold = tree.split_conditions[nodeId];
      const featVal = features[featIdx] || 0;
      
      if (featVal < threshold) {
        nodeId = tree.left_children[nodeId];
      } else {
        nodeId = tree.right_children[nodeId];
      }
    }
  }
  
  return sum;
}

// Our feature list (must match training)
const FEATURE_KEYS = [
  'area', 'rooms', 'year', 'age',
  'floorRatio', 'energyNum',
  'lat', 'lon',
  'matStone', 'matWood', 'matPanel',
  'isNew',
  'comp_avg_price_sqm_1km', 'comp_count_1km',
  'dist_school_km', 'dist_transit_km',
];

function featurize(props, spatialData) {
  const f = [];
  for (const k of FEATURE_KEYS) {
    let val = 0;
    if (k === 'age' && props.year && props.year > 1800) {
      val = 2026 - props.year;  // auto-compute age from year
    } else if (k === 'roomDensity' && props.rooms && props.area) {
      val = props.rooms / props.area;
    } else if (k.startsWith('comp_')) {
      val = spatialData?.[k] || props[k] || 0;
    } else {
      val = props[k] ?? 0;
    }
    f.push(val);
  }
  return f;
}

// Load the model once
const MODEL_PATH = path.join(process.cwd(), 'public', 'models', 'avm_v4.json');
let _model = null;

function getModel() {
  if (!_model) _model = loadModel(MODEL_PATH);
  return _model;
}

/**
 * Predict price/m² using the XGBoost model
 * Returns predicted price/m², or null if model unavailable
 */
function predictPricePerSqm(propertyFeatures, spatialFeatures) {
  const model = getModel();
  if (!model) return null;
  
  try {
    const features = featurize(propertyFeatures, spatialFeatures);
    const rawPred = predict(model, features);
    if (!rawPred || rawPred <= 0) return null;
    // Model trained on log1p(price/m²), convert back
    const ppsqm = Math.expm1(rawPred);
    return Math.round(Math.max(100, Math.min(20000, ppsqm)));
  } catch (e) {
    return null;
  }
}

/**
 * Get model metadata
 */
function getModelInfo() {
  const model = getModel();
  if (!model) return null;
  const trees = model.learner?.gradient_booster?.model?.trees;
  return {
    available: true,
    trees: trees?.length || 0,
    features: FEATURE_KEYS,
  };
}

module.exports = { predictPricePerSqm, getModelInfo };
