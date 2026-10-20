import { readAppConfigFile } from '../../../../config/app-config';

export const INCOME_CATEGORY_NAME_MAX_LENGTH =
  readAppConfigFile().income.categoryNameMaxLength;

export const isValidIncomeCategoryName = (name: string): boolean =>
  name.length > 0 && name.length <= INCOME_CATEGORY_NAME_MAX_LENGTH;

export const normalizeIncomeCategoryName = (name: string): string =>
  name.trim().toLowerCase();
