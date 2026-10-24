export interface CreateTransferInput {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  transactionDate: string;
  description?: string | null;
}
