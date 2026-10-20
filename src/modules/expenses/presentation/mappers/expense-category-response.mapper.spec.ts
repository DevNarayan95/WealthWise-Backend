import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExpenseCategoryResponseMapper } from './expense-category-response.mapper';

describe('ExpenseCategoryResponseMapper', () => {
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const customCategory = ExpenseCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Coffee',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const systemCategory = ExpenseCategory.create({
    id: 'system-category-1',
    userId: null,
    name: 'Groceries',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  describe('toDto', () => {
    it('should map a custom category to the response DTO', () => {
      expect(ExpenseCategoryResponseMapper.toDto(customCategory)).toEqual({
        id: 'category-1',
        name: 'Coffee',
        isSystem: false,
        isArchived: false,
        createdAt,
        updatedAt,
      });
    });

    it('should expose the archived state of a category', () => {
      const archivedCategory = ExpenseCategory.create({
        id: 'category-2',
        userId: 'user-1',
        name: 'Old subscription',
        isArchived: true,
        createdAt,
        updatedAt,
      });

      expect(
        ExpenseCategoryResponseMapper.toDto(archivedCategory).isArchived,
      ).toBe(true);
    });

    it('should mark system categories as system and omit the owner', () => {
      const dto = ExpenseCategoryResponseMapper.toDto(systemCategory);

      expect(dto.isSystem).toBe(true);
      expect(dto).not.toHaveProperty('userId');
    });
  });

  describe('toDtoList', () => {
    it('should map each category in order', () => {
      expect(
        ExpenseCategoryResponseMapper.toDtoList([
          systemCategory,
          customCategory,
        ]).map((dto) => dto.id),
      ).toEqual(['system-category-1', 'category-1']);
    });
  });
});
