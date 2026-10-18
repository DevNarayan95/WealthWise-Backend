export type DurationClassification = 'normal' | 'slow' | 'critical';

export interface DurationThresholds {
  slowMs: number;
  criticalMs: number;
}

export const classifyDuration = (
  durationMs: number,
  thresholds: DurationThresholds,
): DurationClassification => {
  if (durationMs >= thresholds.criticalMs) {
    return 'critical';
  }

  if (durationMs >= thresholds.slowMs) {
    return 'slow';
  }

  return 'normal';
};
