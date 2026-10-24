import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { buildPaginatedResponse } from '../../../../common/pagination/paginated-response';
import { ExportFormat } from '../../../../common/export/export-table';
import {
  renderExport,
  toStreamableFile,
} from '../../../../common/export/export-renderer';
import { TransactionsService } from '../../application/services/transactions.service';
import { TransactionExportMapper } from '../mappers/transaction-export.mapper';
import { ExportTransactionsQueryDto } from '../dto/export-transactions-query.dto';
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
      transactionDate: dto.transactionDate,
      incomeCategoryId: dto.incomeCategoryId ?? null,
      expenseCategoryId: dto.expenseCategoryId ?? null,
    });

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:read')
  @ApiOperation({
    summary: 'Export transactions',
    description:
      'Downloads the transactions of the authenticated user as a CSV or PDF attachment. Accepts the same filters as the list endpoint, except pagination. Requires the transactions:read permission. Returns 422 when the match count exceeds the configured export limit.',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ExportFormat,
    description: 'Export file format.',
  })
  @ApiProduces('text/csv', 'application/pdf')
  @ApiOkResponse({
    description: 'Transactions exported as a file attachment.',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filters or unsupported export format.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have the required permission.',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found.',
  })
  @ApiResponse({
    status: 422,
    description: 'The export exceeds the configured row limit.',
  })
  async exportTransactions(
    @Query() query: ExportTransactionsQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const records = await this.transactionsService.findAllForExport({
      userId: request.user.userId,
      accountId: query.accountId,
      from: query.from,
      to: query.to,
      type: query.type,
      incomeCategoryId: query.incomeCategoryId,
      expenseCategoryId: query.expenseCategoryId,
    });

    const rendered = await renderExport({
      table: TransactionExportMapper.toExportTable(
        records,
        new Date(),
        TransactionExportMapper.toFilterLabels(query),
      ),
      format: query.format,
      resource: 'transactions',
    });

    return toStreamableFile(rendered);
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
      'Retrieves paginated transactions owned by the authenticated user. Results can be narrowed by account, date range (from, to), type, and category. Omit accountId to list across all accounts.',
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
      from: query.from,
      to: query.to,
      type: query.type,
      incomeCategoryId: query.incomeCategoryId,
      expenseCategoryId: query.expenseCategoryId,
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
      transactionDate: dto.transactionDate,
      description: dto.description ?? null,
    });

    return successResponse(TransactionResponseMapper.toDto(transaction));
  }
}
