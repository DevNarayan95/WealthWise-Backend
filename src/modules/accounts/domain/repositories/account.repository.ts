import {
  Account,
  AccountType,
  AccountStatus,
} from '../entities/account.entity';

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

export interface UpdateAccountRepositoryInput {
  accountId: string;
  userId: string;
  status: AccountStatus;
}

export interface GetAccountBalanceRepositoryInput {
  accountId: string;
  userId: string;
  asOf?: Date;
}

export interface GetAccountBalanceRepositoryOutput {
  accountId: string;
  currency: string;
  balance: string;
}

export interface GetAccountBalancesRepositoryInput {
  userId: string;
  accountIds: string[];
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

  abstract update(input: UpdateAccountRepositoryInput): Promise<Account | null>;

  abstract getBalanceForUser(
    input: GetAccountBalanceRepositoryInput,
  ): Promise<GetAccountBalanceRepositoryOutput | null>;

  abstract getBalancesForAccounts(
    input: GetAccountBalancesRepositoryInput,
  ): Promise<GetAccountBalanceRepositoryOutput[]>;
}
