import { Body, Controller, Post } from '@nestjs/common';

import { successResponse } from '../../../common/utils/api-response.util';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseMapper } from '../mappers/user-response.mapper';
import { UsersService } from '../services/users.service';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return successResponse(UserResponseMapper.toDto(user));
  }
}
