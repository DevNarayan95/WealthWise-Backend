import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';

import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { successResponse } from '../../../../common/utils/api-response.util';

import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';

import { UsersService } from '../../application/services/users.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserResponseEnvelopeDto } from '../dto/user-response-envelope.dto';
import { UserResponseMapper } from '../mappers/user-response.mapper';

@ApiTags('Users')
@RequiresApiKeyAndJwt()
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
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
