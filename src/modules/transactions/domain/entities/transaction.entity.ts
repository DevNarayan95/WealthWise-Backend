export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export type TransactionRateSource =
  'IDENTITY' | 'PROVIDER' | 'FALLBACK' | 'MANUAL';

export interface TransactionProps {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  transactionDate: string;
  reversalOfTransactionId: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
  baseCurrency: string;
  baseAmount: string;
  exchangeRate: string;
  rateDate: string;
  rateSource: TransactionRateSource;
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

  get transactionDate(): string {
    return this.props.transactionDate;
  }

  get reversalOfTransactionId(): string | null {
    return this.props.reversalOfTransactionId;
  }

  get incomeCategoryId(): string | null {
    return this.props.incomeCategoryId;
  }

  get expenseCategoryId(): string | null {
    return this.props.expenseCategoryId;
  }

  get baseCurrency(): string {
    return this.props.baseCurrency;
  }

  get baseAmount(): string {
    return this.props.baseAmount;
  }

  get exchangeRate(): string {
    return this.props.exchangeRate;
  }

  get rateDate(): string {
    return this.props.rateDate;
  }

  get rateSource(): TransactionRateSource {
    return this.props.rateSource;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
