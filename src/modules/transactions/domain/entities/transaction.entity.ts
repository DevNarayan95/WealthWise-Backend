export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface TransactionProps {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  static create(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  get id(): string {
    return this.props.id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get type(): TransactionType {
    return this.props.type;
  }

  get amount(): string {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get description(): string | null {
    return this.props.description;
  }

  get transactionDate(): Date {
    return this.props.transactionDate;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
