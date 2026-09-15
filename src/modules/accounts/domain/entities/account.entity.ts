export enum AccountType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT',
  OTHER = 'OTHER',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface AccountProps {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Account {
  private constructor(private readonly props: AccountProps) {}

  static create(props: AccountProps): Account {
    return new Account(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get type(): AccountType {
    return this.props.type;
  }

  get currency(): string {
    return this.props.currency;
  }

  get openingBalance(): string {
    return this.props.openingBalance;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
