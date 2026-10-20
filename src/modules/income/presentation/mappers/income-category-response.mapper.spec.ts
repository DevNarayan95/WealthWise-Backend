import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { IncomeCategoryResponseMapper } from './income-category-response.mapper';

describe('IncomeCategoryResponseMapper', () => {
  const createdAt = new Date('2026-09-20T10:00:00.000Z');
  const updatedAt = new Date('2026-09-20T11:00:00.000Z');

  const customCategory = IncomeCategory.create({
    id: 'category-1',
    userId: 'user-1',
    name: 'Freelance',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  const systemCategory = IncomeCategory.create({
    id: 'system-category-1',
    userId: null,
    name: 'Salary',
    isArchived: false,
    createdAt,
    updatedAt,
  });

  describe('toDto', () => {
    it('should map a custom category to the response DTO', () => {
      expect(IncomeCategoryResponseMapper.toDto(customCategory)).toEqual({
        id: 'category-1',
        name: 'Freelance',
        isSystem: false,
        isArchived: false,
        createdAt,
        updatedAt,
      });
    });

    it('should expose the archived state of a category', () => {
      const archivedCategory = IncomeCategory.create({
        id: 'category-2',
        userId: 'user-1',
        name: 'Old side project',
        isArchived: true,
        createdAt,
        updatedAt,
      });

      expect(
        IncomeCategoryResponseMapper.toDto(archivedCategory).isArchived,
      ).toBe(true);
    });

    it('should mark system categories as system and omit the owner', () => {
      const dto = IncomeCategoryResponseMapper.toDto(systemCategory);

      expect(dto.isSystem).toBe(true);
      expect(dto).not.toHaveProperty('userId');
    });
  });

  describe('toDtoList', () => {
    it('should map each category in order', () => {
      expect(
        IncomeCategoryResponseMapper.toDtoList([
          systemCategory,
          customCategory,
        ]).map((dto) => dto.id),
      ).toEqual(['system-category-1', 'category-1']);
    });
  });
});
