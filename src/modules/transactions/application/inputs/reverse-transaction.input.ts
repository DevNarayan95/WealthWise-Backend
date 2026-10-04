export interface ReverseTransactionInput {
  transactionId: string;
  userId: string;
  transactionDate: Date;
  description: string | null;
}
