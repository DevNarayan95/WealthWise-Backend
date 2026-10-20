import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionResponseDto } from '../dto/transaction-response.dto';

export class TransactionResponseMapper {
  static toDto(transaction: Transaction): TransactionResponseDto {
    return {
      id: transaction.id,
      accountId: transaction.accountId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      reversalOfTransactionId: transaction.reversalOfTransactionId,
      incomeCategoryId: transaction.incomeCategoryId,
      expenseCategoryId: transaction.expenseCategoryId,
      baseCurrency: transaction.baseCurrency,
      baseAmount: transaction.baseAmount,
      exchangeRate: transaction.exchangeRate,
      rateDate: transaction.rateDate,
      rateSource: transaction.rateSource,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
