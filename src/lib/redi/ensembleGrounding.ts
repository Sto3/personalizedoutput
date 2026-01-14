/**
 * Ensemble Grounding Service
 *
 * Requires multiple signals to agree before trusting a detection.
 * This prevents hallucinations by cross-validating across:
 * - iOS Vision (object detection)
 * - iOS OCR (text recognition)
 * - Audio classification
 * - Cloud vision (when available)
 *
 * Key principle: Only output what multiple independent systems confirm.
 */

import { calibrateObjectConfidence, calibrateConfidence, combineConfidences } from './confidenceCalibration';

// Detection from a single source
interface RawDetection {
  label: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  source: 'ios_vision' | 'ios_ocr' | 'audio' | 'cloud_vision' | 'motion';
}

// Grounded detection confirmed by multiple sources
export interface GroundedDetection {
  label: string;
  confidence: number;
  sources: string[];
  category: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

// Audio event for context
interface AudioEvent {
  label: string;
  confidence: number;
}

// Related term mappings for cross-validation
const RELATED_TERMS: Record<string, string[]> = {
  // Objects and their associated text
  'bottle': ['water', 'soda', 'ml', 'oz', 'drink'],
  'cup': ['coffee', 'tea', 'mug'],
  'phone': ['iphone', 'samsung', 'mobile', 'cell'],
  'laptop': ['macbook', 'dell', 'hp', 'thinkpad'],
  'book': ['chapter', 'page', 'isbn'],
  'box': ['package', 'shipping', 'contains'],

  // Kitchen objects
  'knife': ['blade', 'steel', 'chef'],
  'spoon': ['tablespoon', 'teaspoon'],
  'bowl': ['serving', 'mixing'],

  // Hygiene products (common hallucination targets)
  'toothbrush': ['oral-b', 'colgate', 'bristle'],
  'toothpaste': ['fluoride', 'whitening', 'fresh'],
};

// Audio context that confirms object types
const AUDIO_CONTEXT_MAPPING: Record<string, string[]> = {
  // Kitchen sounds → kitchen objects
  'sizzling': ['pan', 'stove', 'cooking', 'food'],
  'chopping': ['knife', 'cutting board', 'food'],
  'running water': ['sink', 'faucet', 'dishes'],
  'microwave beep': ['microwave', 'kitchen'],

  // Gym sounds → gym objects
  'weights clanking': ['dumbbell', 'barbell', 'weights'],
  'treadmill': ['exercise', 'gym'],

  // Music sounds → music objects
  'guitar': ['guitar', 'strings', 'music'],
  'piano': ['piano', 'keyboard', 'music'],
};

/**
 * Check if a detected object is related to detected text
 */
function textConfirmsObject(objectLabel: string, texts: string[]): boolean {
  const lowerLabel = objectLabel.toLowerCase();
  const relatedTerms = RELATED_TERMS[lowerLabel] || [];

  for (const text of texts) {
    const lowerText = text.toLowerCase();

    // Direct match
    if (lowerText.includes(lowerLabel)) return true;

    // Related term match
    if (relatedTerms.some(term => lowerText.includes(term))) return true;
  }

  return false;
}

/**
 * Check if audio context confirms an object detection
 */
function audioConfirmsObject(objectLabel: string, audioEvents: AudioEvent[]): boolean {
  const lowerLabel = objectLabel.toLowerCase();

  for (const event of audioEvents) {
    const audioLabel = event.label.toLowerCase();
    const confirmedObjects = AUDIO_CONTEXT_MAPPING[audioLabel] || [];

    if (confirmedObjects.some(obj => lowerLabel.includes(obj) || obj.includes(lowerLabel))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two detections are referring to the same object
 */
function detectionsMatch(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();

  // Direct match
  if (la === lb) return true;

  // Substring match
  if (la.includes(lb) || lb.includes(la)) return true;

  // Check related terms
  const relatedA = RELATED_TERMS[la] || [];
  const relatedB = RELATED_TERMS[lb] || [];

  return relatedA.includes(lb) || relatedB.includes(la);
}

/**
 * Ground detections by requiring multiple confirming sources
 * This is the main entry point for preventing hallucinations
 */
export function groundDetections(
  iosObjects: RawDetection[],
  iosTexts: string[],
  audioEvents: AudioEvent[],
  cloudVision?: RawDetection[]
): GroundedDetection[] {
  const grounded: GroundedDetection[] = [];

  // Process iOS object detections
  for (const obj of iosObjects) {
    const sources = ['ios_vision'];
    let confidence = calibrateObjectConfidence(obj.confidence);

    // Check if text confirms the object
    if (textConfirmsObject(obj.label, iosTexts)) {
      sources.push('ios_ocr');
      confidence = Math.min(confidence + 0.2, 1.0);
    }

    // Check if audio confirms the context
    if (audioConfirmsObject(obj.label, audioEvents)) {
      sources.push('audio');
      confidence = Math.min(confidence + 0.15, 1.0);
    }

    // Check if cloud vision agrees
    if (cloudVision) {
      const cloudMatch = cloudVision.find(c => detectionsMatch(c.label, obj.label));
      if (cloudMatch) {
        sources.push('cloud_vision');
        // Combine confidences
        confidence = combineConfidences([
          { value: confidence, weight: 2, type: 'object_detection' },
          { value: cloudMatch.confidence, weight: 1, type: 'cloud_vision' }
        ]);
      }
    }

    // Determine category
    const category = categorizeObject(obj.label);

    grounded.push({
      label: obj.label,
      confidence,
      sources,
      category,
      boundingBox: obj.boundingBox
    });
  }

  // Only return detections that meet confidence threshold OR have multiple sources
  return grounded.filter(g =>
    g.confidence > 0.6 || g.sources.length >= 2
  );
}

/**
 * Categorize an object for mode detection
 */
function categorizeObject(label: string): string {
  const categoryMap: Record<string, string[]> = {
    kitchen: ['knife', 'spoon', 'fork', 'pot', 'pan', 'stove', 'oven', 'refrigerator', 'sink', 'microwave'],
    gym: ['dumbbell', 'barbell', 'treadmill', 'weights', 'yoga mat', 'exercise'],
    electronics: ['laptop', 'phone', 'tablet', 'keyboard', 'mouse', 'monitor', 'tv'],
    study: ['book', 'notebook', 'pen', 'pencil', 'paper'],
    music: ['guitar', 'piano', 'drum', 'violin', 'microphone'],
    food: ['apple', 'banana', 'pizza', 'sandwich', 'bowl', 'plate'],
  };

  const lowerLabel = label.toLowerCase();
  for (const [category, items] of Object.entries(categoryMap)) {
    if (items.some(item => lowerLabel.includes(item))) {
      return category;
    }
  }

  return 'other';
}

/**
 * Get the overall scene confidence based on grounded detections
 */
export function getSceneConfidence(groundedDetections: GroundedDetection[]): number {
  if (groundedDetections.length === 0) return 0;

  // Average confidence weighted by number of sources
  const weightedSum = groundedDetections.reduce((sum, d) => {
    const weight = d.sources.length;
    return sum + d.confidence * weight;
  }, 0);

  const totalWeight = groundedDetections.reduce((sum, d) => sum + d.sources.length, 0);

  return weightedSum / totalWeight;
}

/**
 * Determine if we should speak about the scene
 */
export function shouldSpeakAboutScene(
  groundedDetections: GroundedDetection[],
  sceneConfidence: number
): boolean {
  // Need either:
  // 1. High overall confidence (>0.7)
  // 2. Multiple grounded detections (>=2)
  // 3. At least one detection with multiple sources

  if (sceneConfidence > 0.7) return true;
  if (groundedDetections.length >= 2) return true;
  if (groundedDetections.some(d => d.sources.length >= 2)) return true;

  return false;
}
