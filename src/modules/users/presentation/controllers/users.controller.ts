import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { successResponse } from '../../../../common/utils/api-response.util';

import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

import { UsersService } from '../../application/services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserResponseEnvelopeDto } from '../dto/user-response-envelope.dto';
import { UserResponseMapper } from '../mappers/user-response.mapper';

@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users:create')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a new user. Requires an authenticated user with the users:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
    type: UserResponseEnvelopeDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
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
    status: 409,
    description: 'A user with the specified email already exists.',
  })
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<ApiSuccessResponse<UserResponseDto>> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return successResponse(UserResponseMapper.toDto(user));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user returned successfully.',
    type: UserResponseEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  async getMe(
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<UserResponseDto>> {
    const user = await this.usersService.findById(request.user.userId);

    return successResponse(UserResponseMapper.toDto(user));
  }
}
