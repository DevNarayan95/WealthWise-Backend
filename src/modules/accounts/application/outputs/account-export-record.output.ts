import { Account } from '../../domain/entities/account.entity';

export interface AccountExportRecord {
  account: Account;
  currentBalance: string;
}
