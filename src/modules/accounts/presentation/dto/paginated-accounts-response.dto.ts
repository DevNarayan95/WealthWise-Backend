import { ApiProperty } from '@nestjs/swagger';
import { AccountResponseDto } from './account-response.dto';

export class PaginatedAccountsResponseDto {
  @ApiProperty({
    type: [AccountResponseDto],
  })
  items!: AccountResponseDto[];
}
