import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { successResponse } from '../../../../common/utils/api-response.util';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { AccountsService } from '../../application/services/accounts.service';
import { AccountResponseDto } from '../dto/account-response.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { AccountResponseMapper } from '../mappers/account-response.mapper';
import { ListAccountsQueryDto } from '../dto/list-accounts-query.dto';
import { PaginatedAccountsResponseDto } from '../dto/paginated-accounts-response.dto';

@ApiTags('Accounts')
@Controller({
  path: 'accounts',
  version: '1',
})
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('accounts:create')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates a new financial account for the authenticated user. Requires the accounts:create permission.',
  })
  @ApiBody({
    type: CreateAccountDto,
    examples: {
      bankAccount: {
        summary: 'Bank account',
        description: 'Example of a MYR bank account.',
        value: {
          name: 'Maybank Savings',
          type: 'BANK_ACCOUNT',
          currency: 'MYR',
          openingBalance: '1250.5000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully.',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid account data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have the required permission.',
  })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAccountDto,
  ): Promise<ApiSuccessResponse<AccountResponseDto>> {
    const account = await this.accountsService.create({
      userId: request.user.userId,
      name: dto.name,
      type: dto.type,
      currency: dto.currency,
      openingBalance: dto.openingBalance,
    });

    return successResponse(AccountResponseMapper.toDto(account));
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('accounts:read')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List accounts',
    description:
      'Returns paginated financial accounts belonging to the authenticated user. Requires the accounts:read permission.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number. Starts from 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Number of accounts per page. Maximum 100.',
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts returned successfully.',
    type: PaginatedAccountsResponseDto,
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListAccountsQueryDto,
  ): Promise<ApiSuccessResponse<PaginatedAccountsResponseDto>> {
    const result = await this.accountsService.findAll(
      request.user.userId,
      query.page,
      query.limit,
    );

    return successResponse(
      {
        items: AccountResponseMapper.toDtoList(result.items),
      },
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('accounts:read')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get an account',
    description:
      'Returns a financial account belonging to the authenticated user. Requires the accounts:read permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Account UUID.',
    example: '7d7c6f6e-9b13-4c68-a6b5-123456789abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Account returned successfully.',
    type: AccountResponseDto,
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
    description: 'Account was not found.',
  })
  async findById(
    @Req() request: AuthenticatedRequest,
    @Param('id') accountId: string,
  ): Promise<ApiSuccessResponse<AccountResponseDto>> {
    const account = await this.accountsService.findById(
      accountId,
      request.user.userId,
    );

    return successResponse(AccountResponseMapper.toDto(account));
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('accounts:update')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Archive an account',
    description:
      'Archives an account owned by the authenticated user. ' +
      'Archived accounts are retained and can still be viewed, but cannot be archived again.',
  })
  @ApiParam({
    name: 'id',
    description: 'Account ID',
    type: String,
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Account archived successfully',
    type: AccountResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is required' })
  @ApiForbiddenResponse({
    description: 'User does not have the accounts:update permission',
  })
  @ApiNotFoundResponse({
    description:
      'Account was not found or does not belong to the authenticated user',
  })
  @ApiConflictResponse({ description: 'Account is already archived' })
  async archive(
    @Param('id') accountId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<AccountResponseDto>> {
    const account = await this.accountsService.archive(
      accountId,
      request.user.userId,
    );

    return successResponse(AccountResponseMapper.toDto(account));
  }
}
