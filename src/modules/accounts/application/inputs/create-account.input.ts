import { AccountType } from '../../domain/entities/account.entity';

export interface CreateAccountInput {
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
}
