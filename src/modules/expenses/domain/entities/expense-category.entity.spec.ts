import { ExpenseCategory } from './expense-category.entity';

describe('ExpenseCategory', () => {
  const baseProps = {
    id: 'cat-1',
    name: 'Groceries',
    isArchived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('should expose the provided props through getters', () => {
    const category = ExpenseCategory.create({ ...baseProps, userId: 'user-1' });

    expect(category.id).toBe('cat-1');
    expect(category.userId).toBe('user-1');
    expect(category.name).toBe('Groceries');
    expect(category.isArchived).toBe(false);
    expect(category.createdAt).toEqual(baseProps.createdAt);
    expect(category.updatedAt).toEqual(baseProps.updatedAt);
  });

  it('should be a system category when userId is null', () => {
    const category = ExpenseCategory.create({ ...baseProps, userId: null });

    expect(category.isSystem).toBe(true);
    expect(category.userId).toBeNull();
  });

  it('should not be a system category when userId is set', () => {
    const category = ExpenseCategory.create({ ...baseProps, userId: 'user-1' });

    expect(category.isSystem).toBe(false);
  });
});
