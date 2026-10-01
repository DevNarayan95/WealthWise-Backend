import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { TransactionsService } from '../../application/services/transactions.service';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { TransactionResponseMapper } from '../mappers/transaction-response.mapper';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { TransactionResponseDto } from '../dto/transaction-response.dto';
import { successResponse } from '../../../../common/utils/api-response.util';

@ApiTags('Transactions')
@Controller({
  path: 'transactions',
  version: '1',
})
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a transaction',
    description:
      'Creates an income or expense transaction for an account owned by the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: TransactionResponseMapper,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found.',
  })
  async create(
    @Body() dto: CreateTransactionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransactionResponseDto>> {
    const transaction = await this.transactionsService.create({
      userId: request.user.userId,
      accountId: dto.accountId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description ?? null,
      transactionDate: new Date(dto.transactionDate),
    });

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }
}
