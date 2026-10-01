import { TransactionType } from '../entities/transaction.entity';

export const TRANSACTION_CURRENCY_LENGTH = 3;
export const TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES = 4;
export const TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS = 15;
export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 255;

export const isTransactionType = (value: string): value is TransactionType => {
  return Object.values(TransactionType).includes(value as TransactionType);
};

export const isValidTransactionCurrency = (currency: string): boolean => {
  return /^[A-Z]{3}$/.test(currency);
};

export const isValidTransactionAmount = (amount: string): boolean => {
  return /^(?=.*[1-9])\d{1,15}(?:\.\d{1,4})?$/.test(amount);
};

export const isValidTransactionDate = (date: Date): boolean => {
  return !Number.isNaN(date.getTime());
};
