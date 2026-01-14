/**
 * Confidence Calibration Service
 *
 * Makes confidence scores meaningful - when the model says "90% confident"
 * it should actually be correct ~90% of the time.
 *
 * Uses temperature scaling and learned calibration factors based on
 * observed accuracy during testing.
 */

// Temperature parameter learned from validation
// Higher temperature = more conservative confidence estimates
const DEFAULT_TEMPERATURE = 1.8;

// Calibration factors for different detection types
const CALIBRATION_FACTORS: Record<string, number> = {
  object_detection: 0.85,    // YOLO tends to be overconfident
  text_recognition: 0.95,    // OCR is usually well-calibrated
  pose_detection: 0.90,      // Pose detection varies by quality
  audio_classification: 0.80, // Audio can be noisy
  cloud_vision: 0.75,        // Cloud models can hallucinate
};

/**
 * Apply temperature scaling to raw logits
 * This is the standard calibration technique from ML literature
 */
export function calibrateLogits(
  rawLogits: number[],
  temperature: number = DEFAULT_TEMPERATURE
): number[] {
  // Apply temperature scaling
  const scaledLogits = rawLogits.map(l => l / temperature);

  // Softmax
  const maxLogit = Math.max(...scaledLogits);
  const expLogits = scaledLogits.map(l => Math.exp(l - maxLogit));
  const sumExp = expLogits.reduce((a, b) => a + b, 0);

  return expLogits.map(e => e / sumExp);
}

/**
 * Calibrate a single confidence score for a specific detection type
 */
export function calibrateConfidence(
  rawConfidence: number,
  detectionType: keyof typeof CALIBRATION_FACTORS
): number {
  const factor = CALIBRATION_FACTORS[detectionType] || 0.85;
  return Math.min(rawConfidence * factor, 1.0);
}

/**
 * Calibrate object detection confidence
 * YOLO typically overestimates - apply correction
 */
export function calibrateObjectConfidence(rawConfidence: number): number {
  return calibrateConfidence(rawConfidence, 'object_detection');
}

/**
 * Calibrate cloud vision confidence
 * Cloud models can hallucinate - be conservative
 */
export function calibrateCloudVisionConfidence(rawConfidence: number): number {
  return calibrateConfidence(rawConfidence, 'cloud_vision');
}

/**
 * Get an overall confidence score by combining multiple signals
 * Uses weighted geometric mean for more conservative estimates
 */
export function combineConfidences(
  confidences: Array<{ value: number; weight: number; type: string }>
): number {
  if (confidences.length === 0) return 0;

  // First calibrate each confidence
  const calibrated = confidences.map(c => ({
    value: calibrateConfidence(c.value, c.type as keyof typeof CALIBRATION_FACTORS),
    weight: c.weight
  }));

  // Weighted geometric mean (more conservative than arithmetic mean)
  const totalWeight = calibrated.reduce((sum, c) => sum + c.weight, 0);
  const logSum = calibrated.reduce(
    (sum, c) => sum + c.weight * Math.log(Math.max(c.value, 0.001)),
    0
  );

  return Math.exp(logSum / totalWeight);
}

/**
 * Determine confidence level category
 */
export function getConfidenceLevel(calibratedConfidence: number): 'high' | 'medium' | 'low' | 'very_low' {
  if (calibratedConfidence >= 0.85) return 'high';
  if (calibratedConfidence >= 0.60) return 'medium';
  if (calibratedConfidence >= 0.35) return 'low';
  return 'very_low';
}

/**
 * Should we trust this detection enough to act on it?
 */
export function shouldTrustDetection(
  calibratedConfidence: number,
  actionType: 'speak' | 'suggest' | 'act'
): boolean {
  const thresholds: Record<typeof actionType, number> = {
    speak: 0.6,    // Need moderate confidence to speak
    suggest: 0.4,  // Can suggest with lower confidence
    act: 0.8,      // Need high confidence to take action
  };

  return calibratedConfidence >= thresholds[actionType];
}
