import { classifyDuration } from './duration-classifier';

describe('classifyDuration', () => {
  const thresholds = { slowMs: 1000, criticalMs: 3000 };

  it('returns normal below the slow threshold', () => {
    expect(classifyDuration(999, thresholds)).toBe('normal');
  });

  it('returns slow at the slow threshold', () => {
    expect(classifyDuration(1000, thresholds)).toBe('slow');
  });

  it('returns slow between the slow and critical thresholds', () => {
    expect(classifyDuration(2999, thresholds)).toBe('slow');
  });

  it('returns critical at the critical threshold', () => {
    expect(classifyDuration(3000, thresholds)).toBe('critical');
  });

  it('returns critical above the critical threshold', () => {
    expect(classifyDuration(10000, thresholds)).toBe('critical');
  });
});
