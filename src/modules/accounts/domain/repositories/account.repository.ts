import { Account, AccountType } from '../entities/account.entity';

export interface CreateAccountRepositoryInput {
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
}

export interface FindAccountsRepositoryInput {
  userId: string;
  skip: number;
  take: number;
}

export interface FindAccountsRepositoryOutput {
  accounts: Account[];
  total: number;
}

export abstract class AccountRepository {
  abstract create(input: CreateAccountRepositoryInput): Promise<Account>;

  abstract findByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<Account | null>;

  abstract findAllByUserId(
    input: FindAccountsRepositoryInput,
  ): Promise<FindAccountsRepositoryOutput>;
}
