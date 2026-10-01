import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { TransactionResponseEnvelopeDto } from '../dto/transaction-response-envelope.dto';
import { TransactionListResponseEnvelopeDto } from '../dto/transaction-list-response-envelope.dto';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';

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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get a transaction',
    description: 'Retrieves a transaction owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully.',
    type: TransactionResponseEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found.',
  })
  async findById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransactionResponseDto>> {
    const transaction = await this.transactionsService.findById(
      id,
      request.user.userId,
    );

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List transactions',
    description:
      'Retrieves paginated transactions for an account owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully.',
    type: TransactionListResponseEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found.',
  })
  async findAll(
    @Query() query: ListTransactionsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransactionResponseDto[]>> {
    const offset = (query.page - 1) * query.limit;

    const result = await this.transactionsService.findAll({
      accountId: query.accountId,
      userId: request.user.userId,
      offset,
      limit: query.limit,
    });

    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    return {
      success: true,
      data: result.transactions.map((transaction) =>
        TransactionResponseMapper.toDto(transaction),
      ),
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }
}
