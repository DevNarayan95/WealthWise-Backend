import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import { successResponse } from '../../../../common/utils/api-response.util';

import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';

import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseMapper } from '../mappers/user-response.mapper';
import { UsersService } from '../../application/services/users.service';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users:create')
  async create(@Body() dto: CreateUserDto) {
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
  async getMe(@Req() request: AuthenticatedRequest) {
    const user = await this.usersService.findById(request.user.userId);

    return {
      success: true,
      data: UserResponseMapper.toDto(user),
    };
  }
}
