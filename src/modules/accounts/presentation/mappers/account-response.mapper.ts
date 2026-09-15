import { Account } from '../../domain/entities/account.entity';
import { AccountResponseDto } from '../dto/account-response.dto';

export class AccountResponseMapper {
  static toDto(account: Account): AccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      openingBalance: account.openingBalance,
      status: account.status,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  static toDtoList(accounts: Account[]): AccountResponseDto[] {
    return accounts.map((account) => this.toDto(account));
  }
}
