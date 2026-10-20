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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { buildPaginatedResponse } from '../../../../common/pagination/paginated-response';
import { TransactionsService } from '../../application/services/transactions.service';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { TransactionResponseMapper } from '../mappers/transaction-response.mapper';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { TransactionResponseDto } from '../dto/transaction-response.dto';
import { successResponse } from '../../../../common/utils/api-response.util';
import { TransactionResponseEnvelopeDto } from '../dto/transaction-response-envelope.dto';
import {
  TransactionListDataDto,
  TransactionListResponseEnvelopeDto,
} from '../dto/transaction-list-response-envelope.dto';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { ReverseTransactionDto } from '../dto/reverse-transaction.dto';

@ApiTags('Transactions')
@RequiresApiKeyAndJwt()
@Controller({
  path: 'transactions',
  version: '1',
})
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:create')
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
      incomeCategoryId: dto.incomeCategoryId ?? null,
    });

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:read')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:read')
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
  ): Promise<ApiSuccessResponse<TransactionListDataDto>> {
    const offset = (query.page - 1) * query.limit;

    const result = await this.transactionsService.findAll({
      accountId: query.accountId,
      userId: request.user.userId,
      offset,
      limit: query.limit,
    });

    return buildPaginatedResponse({
      items: result.transactions.map((transaction) =>
        TransactionResponseMapper.toDto(transaction),
      ),
      page: query.page,
      limit: query.limit,
      total: result.total,
    });
  }

  @Post(':id/reversal')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:update')
  @ApiOperation({
    summary: 'Reverse a transaction',
    description:
      'Creates a reversal transaction for an existing transaction owned by the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction reversed successfully.',
    type: TransactionResponseEnvelopeDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reversal request or transaction cannot be reversed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found.',
  })
  async reverse(
    @Param('id') id: string,
    @Body() dto: ReverseTransactionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransactionResponseDto>> {
    const transaction = await this.transactionsService.reverse({
      transactionId: id,
      userId: request.user.userId,
      transactionDate: new Date(dto.transactionDate),
      description: dto.description ?? null,
    });

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }
}
