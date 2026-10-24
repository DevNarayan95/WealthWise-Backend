import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';
import { successResponse } from '../../../../common/utils/api-response.util';
import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { TransfersService } from '../../application/services/transfers.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { ReverseTransferDto } from '../dto/reverse-transfer.dto';
import { TransferResponseDto } from '../dto/transfer-response.dto';
import { TransferResponseMapper } from '../mappers/transfer-response.mapper';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

@ApiTags('Transfers')
@RequiresApiKeyAndJwt()
@Controller({ path: 'transfers', version: '1' })
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:create')
  @ApiOperation({
    summary: 'Create a transfer between two accounts',
    description:
      'Creates a linked TRANSFER_OUT leg on the source account and a TRANSFER_IN leg on the destination account. Cross-currency transfers use the exchange rate for transactionDate.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer created successfully.',
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transfer data, or an account is not active.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found.',
  })
  @ApiResponse({
    status: 503,
    description: 'No exchange rate is available for the transfer currencies.',
  })
  async create(
    @Body() dto: CreateTransferDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransferResponseDto>> {
    const pair = await this.transfersService.create({
      userId: request.user.userId,
      sourceAccountId: dto.sourceAccountId,
      destinationAccountId: dto.destinationAccountId,
      amount: dto.amount,
      transactionDate: dto.transactionDate,
      description: dto.description ?? null,
    });

    return successResponse(TransferResponseMapper.toDto(pair));
  }

  @Post(':transactionId/reversal')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('transactions:update')
  @ApiOperation({
    summary: 'Reverse a transfer',
    description:
      'Reverses both legs of a transfer from either leg. Creates a reversal pair that moves the money back, and a transfer can only be reversed once.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transfer reversed successfully.',
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Transaction is not a transfer leg, or the transfer was already reversed.',
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
    @Param('transactionId') transactionId: string,
    @Body() dto: ReverseTransferDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<TransferResponseDto>> {
    const pair = await this.transfersService.reverse({
      transactionId,
      userId: request.user.userId,
      transactionDate: dto.transactionDate,
      description: dto.description ?? null,
    });

    return successResponse(TransferResponseMapper.toDto(pair));
  }
}
