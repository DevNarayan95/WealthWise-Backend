export interface ReverseTransferInput {
  userId: string;
  transactionId: string;
  transactionDate: string;
  description?: string | null;
}
