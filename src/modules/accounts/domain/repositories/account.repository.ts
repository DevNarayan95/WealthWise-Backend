import { Account } from '../entities/account.entity';

export interface CreateAccountRepositoryInput {
  userId: string;
  name: string;
  type: Account['type'];
  currency: string;
  openingBalance: string;
}

export abstract class AccountRepository {
  abstract create(input: CreateAccountRepositoryInput): Promise<Account>;

  abstract findByIdForUser(
    accountId: string,
    userId: string,
  ): Promise<Account | null>;

  abstract findAllByUserId(userId: string): Promise<Account[]>;
}
