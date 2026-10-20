import { readAppConfigFile } from '../../../../config/app-config';

export const EXPENSE_CATEGORY_NAME_MAX_LENGTH =
  readAppConfigFile().expenses.categoryNameMaxLength;

export const isValidExpenseCategoryName = (name: string): boolean =>
  name.length > 0 && name.length <= EXPENSE_CATEGORY_NAME_MAX_LENGTH;

export const normalizeExpenseCategoryName = (name: string): string =>
  name.trim().toLowerCase();
