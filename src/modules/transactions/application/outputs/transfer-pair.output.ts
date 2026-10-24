import { Transaction } from '../../domain/entities/transaction.entity';

export interface TransferPair {
  transferGroupId: string;
  outLeg: Transaction;
  inLeg: Transaction;
}
