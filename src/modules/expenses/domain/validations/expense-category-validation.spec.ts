import {
  EXPENSE_CATEGORY_NAME_MAX_LENGTH,
  isValidExpenseCategoryName,
  normalizeExpenseCategoryName,
} from './expense-category-validation';

import { readAppConfigFile } from '../../../../config/app-config';

describe('expense-category-validation', () => {
  describe('normalizeExpenseCategoryName', () => {
    it('should trim surrounding whitespace and lowercase the name', () => {
      expect(normalizeExpenseCategoryName('  House rent  ')).toBe('house rent');
    });

    it('should treat names differing only by case as the same', () => {
      expect(normalizeExpenseCategoryName('GROCERIES')).toBe(
        normalizeExpenseCategoryName('groceries'),
      );
    });
  });

  describe('EXPENSE_CATEGORY_NAME_MAX_LENGTH', () => {
    it('should be read from the expenses.categoryNameMaxLength config key', () => {
      expect(EXPENSE_CATEGORY_NAME_MAX_LENGTH).toBe(
        readAppConfigFile().expenses.categoryNameMaxLength,
      );
    });
  });

  describe('isValidExpenseCategoryName', () => {
    it('should accept a non-empty name within the maximum length', () => {
      expect(isValidExpenseCategoryName('Groceries')).toBe(true);
    });

    it('should accept a name exactly at the maximum length', () => {
      expect(
        isValidExpenseCategoryName(
          'a'.repeat(EXPENSE_CATEGORY_NAME_MAX_LENGTH),
        ),
      ).toBe(true);
    });

    it('should reject an empty name', () => {
      expect(isValidExpenseCategoryName('')).toBe(false);
    });

    it('should reject a name longer than the maximum length', () => {
      expect(
        isValidExpenseCategoryName(
          'a'.repeat(EXPENSE_CATEGORY_NAME_MAX_LENGTH + 1),
        ),
      ).toBe(false);
    });
  });
});
