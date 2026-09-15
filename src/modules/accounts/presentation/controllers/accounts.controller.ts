import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
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
      'Returns all financial accounts belonging to the authenticated user. Requires the accounts:read permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts returned successfully.',
    type: AccountResponseDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have the required permission.',
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<AccountResponseDto[]>> {
    const accounts = await this.accountsService.findAll(request.user.userId);

    return successResponse(AccountResponseMapper.toDtoList(accounts));
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
}
