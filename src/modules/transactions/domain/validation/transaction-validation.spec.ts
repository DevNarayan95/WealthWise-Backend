import { TransactionType } from '../entities/transaction.entity';
import {
  isTransactionType,
  isTransferTransactionType,
} from './transaction-validation';

describe('transaction validation', () => {
  describe('isTransactionType', () => {
    it.each([
      TransactionType.INCOME,
      TransactionType.EXPENSE,
      TransactionType.TRANSFER_IN,
      TransactionType.TRANSFER_OUT,
    ])('should accept %s', (type) => {
      expect(isTransactionType(type)).toBe(true);
    });

    it('should reject an unknown transaction type', () => {
      expect(isTransactionType('REFUND')).toBe(false);
    });
  });

  describe('isTransferTransactionType', () => {
    it.each([TransactionType.TRANSFER_IN, TransactionType.TRANSFER_OUT])(
      'should return true for %s',
      (type) => {
        expect(isTransferTransactionType(type)).toBe(true);
      },
    );

    it.each([TransactionType.INCOME, TransactionType.EXPENSE])(
      'should return false for %s',
      (type) => {
        expect(isTransferTransactionType(type)).toBe(false);
      },
    );
  });
});
