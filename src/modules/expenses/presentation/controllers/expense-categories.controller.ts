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
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';
import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { buildPaginatedResponse } from '../../../../common/pagination/paginated-response';
import { PAGINATION } from '../../../../common/pagination/pagination-config';
import { successResponse } from '../../../../common/utils/api-response.util';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { ExpenseCategoriesService } from '../../application/services/expense-categories.service';
import { CreateExpenseCategoryDto } from '../dto/create-expense-category.dto';
import { ExpenseCategoryResponseDto } from '../dto/expense-category-response.dto';
import { ListExpenseCategoriesQueryDto } from '../dto/list-expense-categories-query.dto';
import {
  PaginatedExpenseCategoriesDataDto,
  PaginatedExpenseCategoriesResponseDto,
} from '../dto/paginated-expense-categories-response.dto';
import { UpdateExpenseCategoryDto } from '../dto/update-expense-category.dto';
import { ExpenseCategoryResponseMapper } from '../mappers/expense-category-response.mapper';

@ApiTags('Expenses')
@RequiresApiKeyAndJwt()
@Controller({
  path: 'expenses/categories',
  version: '1',
})
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('expense:create')
  @ApiOperation({
    summary: 'Create an expense category',
    description:
      'Creates a custom expense category for the authenticated user. Requires the expense:create permission.',
  })
  @ApiBody({ type: CreateExpenseCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Expense category created successfully.',
    type: ExpenseCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid expense category data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({
    description: 'User does not have the required permission.',
  })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateExpenseCategoryDto,
  ): Promise<ApiSuccessResponse<ExpenseCategoryResponseDto>> {
    const category = await this.expenseCategoriesService.create({
      userId: request.user.userId,
      name: dto.name,
    });

    return successResponse(ExpenseCategoryResponseMapper.toDto(category));
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('expense:read')
  @ApiOperation({
    summary: 'List expense categories',
    description:
      'Returns paginated system and custom expense categories available to the authenticated user, excluding categories the user has archived. Requires the expense:read permission.',
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
    description: `Number of categories per page. Maximum ${PAGINATION.maxPageSize}.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Expense categories returned successfully.',
    type: PaginatedExpenseCategoriesResponseDto,
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListExpenseCategoriesQueryDto,
  ): Promise<ApiSuccessResponse<PaginatedExpenseCategoriesDataDto>> {
    const result = await this.expenseCategoriesService.findAll(
      request.user.userId,
      query.page,
      query.limit,
    );

    return buildPaginatedResponse({
      items: ExpenseCategoryResponseMapper.toDtoList(result.items),
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('expense:read')
  @ApiOperation({
    summary: 'Get an expense category',
    description:
      'Returns one expense category available to the authenticated user. Requires the expense:read permission.',
  })
  @ApiParam({ name: 'id', description: 'Expense category identifier.' })
  @ApiResponse({
    status: 200,
    description: 'Expense category returned successfully.',
    type: ExpenseCategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Expense category not found.' })
  async findById(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
  ): Promise<ApiSuccessResponse<ExpenseCategoryResponseDto>> {
    const category = await this.expenseCategoriesService.findById(
      categoryId,
      request.user.userId,
    );

    return successResponse(ExpenseCategoryResponseMapper.toDto(category));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('expense:update')
  @ApiOperation({
    summary: 'Rename an expense category',
    description:
      'Renames a custom expense category owned by the authenticated user. System categories are read-only. Requires the expense:update permission.',
  })
  @ApiParam({ name: 'id', description: 'Expense category identifier.' })
  @ApiBody({ type: UpdateExpenseCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Expense category updated successfully.',
    type: ExpenseCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid expense category data.' })
  @ApiForbiddenResponse({
    description:
      'User lacks the expense:update permission, or the category is a read-only system category.',
  })
  @ApiNotFoundResponse({ description: 'Expense category not found.' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ): Promise<ApiSuccessResponse<ExpenseCategoryResponseDto>> {
    const category = await this.expenseCategoriesService.update({
      categoryId,
      userId: request.user.userId,
      name: dto.name,
    });

    return successResponse(ExpenseCategoryResponseMapper.toDto(category));
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('expense:update')
  @ApiOperation({
    summary: 'Archive an expense category',
    description:
      'Hides an expense category for the authenticated user only. This applies to both custom and system categories; other users are not affected. Archived categories are hidden from lists. Requires the expense:update permission.',
  })
  @ApiParam({ name: 'id', description: 'Expense category identifier.' })
  @ApiResponse({
    status: 200,
    description: 'Expense category archived successfully.',
    type: ExpenseCategoryResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'User lacks the expense:update permission.',
  })
  @ApiNotFoundResponse({ description: 'Expense category not found.' })
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
  ): Promise<ApiSuccessResponse<ExpenseCategoryResponseDto>> {
    const category = await this.expenseCategoriesService.archive(
      categoryId,
      request.user.userId,
    );

    return successResponse(ExpenseCategoryResponseMapper.toDto(category));
  }
}
