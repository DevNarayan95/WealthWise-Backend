import { TransactionType } from '../entities/transaction.entity';

export const TRANSACTION_CURRENCY_LENGTH = 3;
export const TRANSACTION_AMOUNT_MAX_DECIMAL_PLACES = 4;
export const TRANSACTION_AMOUNT_MAX_INTEGER_DIGITS = 15;
export const TRANSACTION_DESCRIPTION_MAX_LENGTH = 255;

const TRANSACTION_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isTransactionType = (value: string): value is TransactionType => {
  return Object.values(TransactionType).includes(value as TransactionType);
};

const TRANSFER_TRANSACTION_TYPES: ReadonlySet<TransactionType> = new Set([
  TransactionType.TRANSFER_IN,
  TransactionType.TRANSFER_OUT,
]);

export const isTransferTransactionType = (type: TransactionType): boolean => {
  return TRANSFER_TRANSACTION_TYPES.has(type);
};

export const isValidTransactionCurrency = (currency: string): boolean => {
  return /^[A-Z]{3}$/.test(currency);
};

export const isValidTransactionAmount = (amount: string): boolean => {
  return /^(?=.*[1-9])\d{1,15}(?:\.\d{1,4})?$/.test(amount);
};

export const isValidTransactionDate = (date: string): boolean => {
  const match = TRANSACTION_DATE_PATTERN.exec(date);

  if (!match) {
    return false;
  }

  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const isValidTransactionDescription = (
  description: string | null,
): boolean => {
  return (
    description === null ||
    description.length <= TRANSACTION_DESCRIPTION_MAX_LENGTH
  );
};
