import {
  INCOME_CATEGORY_NAME_MAX_LENGTH,
  isValidIncomeCategoryName,
  normalizeIncomeCategoryName,
} from './income-category-validation';

import { readAppConfigFile } from '../../../../config/app-config';

describe('income-category-validation', () => {
  describe('normalizeIncomeCategoryName', () => {
    it('should trim surrounding whitespace and lowercase the name', () => {
      expect(normalizeIncomeCategoryName('  Freelance  ')).toBe('freelance');
    });

    it('should treat names differing only by case as the same', () => {
      expect(normalizeIncomeCategoryName('SALARY')).toBe(
        normalizeIncomeCategoryName('salary'),
      );
    });
  });

  describe('INCOME_CATEGORY_NAME_MAX_LENGTH', () => {
    it('should be read from the income.categoryNameMaxLength config key', () => {
      expect(INCOME_CATEGORY_NAME_MAX_LENGTH).toBe(
        readAppConfigFile().income.categoryNameMaxLength,
      );
    });
  });

  describe('isValidIncomeCategoryName', () => {
    it('should accept a non-empty name within the maximum length', () => {
      expect(isValidIncomeCategoryName('Salary')).toBe(true);
    });

    it('should accept a name exactly at the maximum length', () => {
      expect(
        isValidIncomeCategoryName('a'.repeat(INCOME_CATEGORY_NAME_MAX_LENGTH)),
      ).toBe(true);
    });

    it('should reject an empty name', () => {
      expect(isValidIncomeCategoryName('')).toBe(false);
    });

    it('should reject a name longer than the maximum length', () => {
      expect(
        isValidIncomeCategoryName(
          'a'.repeat(INCOME_CATEGORY_NAME_MAX_LENGTH + 1),
        ),
      ).toBe(false);
    });
  });
});
