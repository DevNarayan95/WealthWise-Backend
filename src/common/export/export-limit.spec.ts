import { ExportLimitExceededException } from './exceptions/export-limit-exceeded.exception';
import { assertWithinExportLimit, getExportRowLimit } from './export-limit';

describe('export-limit', () => {
  describe('getExportRowLimit', () => {
    it('should read the row limit from config', () => {
      expect(getExportRowLimit()).toBe(5000);
    });
  });

  describe('assertWithinExportLimit', () => {
    it('should allow exactly the maximum number of rows', () => {
      expect(() => assertWithinExportLimit(10, 10)).not.toThrow();
    });

    it('should reject more rows than the maximum', () => {
      expect(() => assertWithinExportLimit(11, 10)).toThrow(
        ExportLimitExceededException,
      );
    });
  });
});
