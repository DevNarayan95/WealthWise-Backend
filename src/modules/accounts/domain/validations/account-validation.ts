import { AccountType } from '../entities/account.entity';

export const ACCOUNT_NAME_MAX_LENGTH = 150;
export const ACCOUNT_CURRENCY_LENGTH = 3;
export const ACCOUNT_MAX_DECIMAL_PLACES = 4;

export const isAccountType = (value: string): value is AccountType => {
  return Object.values(AccountType).includes(value as AccountType);
};

export const isValidCurrencyCode = (currency: string): boolean => {
  return /^[A-Z]{3}$/.test(currency);
};

export function isValidOpeningBalance(value: string): boolean {
  return /^-?\d{1,15}(?:\.\d{1,4})?$/.test(value);
}
