import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RequiresApiKeyAndJwt } from '../../../../common/decorators/api-security.decorator';
import { ExportQueryDto } from '../../../../common/export/dto/export-query.dto';
import { ExportFormat } from '../../../../common/export/export-table';
import {
  renderExport,
  toStreamableFile,
} from '../../../../common/export/export-renderer';
import { ApiResponse as ApiSuccessResponse } from '../../../../common/interfaces/api-response.interface';
import { buildPaginatedResponse } from '../../../../common/pagination/paginated-response';
import { PAGINATION } from '../../../../common/pagination/pagination-config';
import { successResponse } from '../../../../common/utils/api-response.util';
import { Permissions } from '../../../auth/infrastructure/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import type { AuthenticatedRequest } from '../../../auth/infrastructure/interfaces/authenticated-request.interface';
import { IncomeCategoriesService } from '../../application/services/income-categories.service';
import { CreateIncomeCategoryDto } from '../dto/create-income-category.dto';
import { IncomeCategoryResponseDto } from '../dto/income-category-response.dto';
import { ListIncomeCategoriesQueryDto } from '../dto/list-income-categories-query.dto';
import {
  PaginatedIncomeCategoriesDataDto,
  PaginatedIncomeCategoriesResponseDto,
} from '../dto/paginated-income-categories-response.dto';
import { UpdateIncomeCategoryDto } from '../dto/update-income-category.dto';
import { IncomeCategoryExportMapper } from '../mappers/income-category-export.mapper';
import { IncomeCategoryResponseMapper } from '../mappers/income-category-response.mapper';

@ApiTags('Income')
@RequiresApiKeyAndJwt()
@Controller({
  path: 'income/categories',
  version: '1',
})
export class IncomeCategoriesController {
  constructor(
    private readonly incomeCategoriesService: IncomeCategoriesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:create')
  @ApiOperation({
    summary: 'Create an income category',
    description:
      'Creates a custom income category for the authenticated user. Requires the income:create permission.',
  })
  @ApiBody({ type: CreateIncomeCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Income category created successfully.',
    type: IncomeCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid income category data.' })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @ApiForbiddenResponse({
    description: 'User does not have the required permission.',
  })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateIncomeCategoryDto,
  ): Promise<ApiSuccessResponse<IncomeCategoryResponseDto>> {
    const category = await this.incomeCategoriesService.create({
      userId: request.user.userId,
      name: dto.name,
    });

    return successResponse(IncomeCategoryResponseMapper.toDto(category));
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:read')
  @ApiOperation({
    summary: 'List income categories',
    description:
      'Returns paginated system and custom income categories available to the authenticated user. Requires the income:read permission.',
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
    description: 'Income categories returned successfully.',
    type: PaginatedIncomeCategoriesResponseDto,
  })
  async findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListIncomeCategoriesQueryDto,
  ): Promise<ApiSuccessResponse<PaginatedIncomeCategoriesDataDto>> {
    const result = await this.incomeCategoriesService.findAll(
      request.user.userId,
      query.page,
      query.limit,
    );

    return buildPaginatedResponse({
      items: IncomeCategoryResponseMapper.toDtoList(result.items),
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:read')
  @ApiOperation({
    summary: 'Export income categories',
    description:
      'Downloads all income categories available to the authenticated user, including system categories, as a CSV or PDF attachment. Requires the income:read permission. Returns 422 when the category count exceeds the configured export limit.',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ExportFormat,
    description: 'Export file format.',
  })
  @ApiProduces('text/csv', 'application/pdf')
  @ApiOkResponse({
    description: 'Income categories exported as a file attachment.',
    content: {
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unsupported export format.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication is required.',
  })
  @ApiForbiddenResponse({
    description: 'User does not have the required permission.',
  })
  @ApiResponse({
    status: 422,
    description: 'The export exceeds the configured row limit.',
  })
  async exportIncomeCategories(
    @Req() request: AuthenticatedRequest,
    @Query() query: ExportQueryDto,
  ): Promise<StreamableFile> {
    const categories = await this.incomeCategoriesService.findAllForExport(
      request.user.userId,
    );

    const rendered = await renderExport({
      table: IncomeCategoryExportMapper.toExportTable(categories, new Date()),
      format: query.format,
      resource: 'income-categories',
    });

    return toStreamableFile(rendered);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:read')
  @ApiOperation({
    summary: 'Get an income category',
    description:
      'Returns one income category available to the authenticated user. Requires the income:read permission.',
  })
  @ApiParam({ name: 'id', description: 'Income category identifier.' })
  @ApiResponse({
    status: 200,
    description: 'Income category returned successfully.',
    type: IncomeCategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Income category not found.' })
  async findById(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
  ): Promise<ApiSuccessResponse<IncomeCategoryResponseDto>> {
    const category = await this.incomeCategoriesService.findById(
      categoryId,
      request.user.userId,
    );

    return successResponse(IncomeCategoryResponseMapper.toDto(category));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:update')
  @ApiOperation({
    summary: 'Rename an income category',
    description:
      'Renames a custom income category owned by the authenticated user. System categories are read-only. Requires the income:update permission.',
  })
  @ApiParam({ name: 'id', description: 'Income category identifier.' })
  @ApiBody({ type: UpdateIncomeCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Income category updated successfully.',
    type: IncomeCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid income category data.' })
  @ApiForbiddenResponse({
    description:
      'User lacks the income:update permission, or the category is a read-only system category.',
  })
  @ApiNotFoundResponse({ description: 'Income category not found.' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
    @Body() dto: UpdateIncomeCategoryDto,
  ): Promise<ApiSuccessResponse<IncomeCategoryResponseDto>> {
    const category = await this.incomeCategoriesService.update({
      categoryId,
      userId: request.user.userId,
      name: dto.name,
    });

    return successResponse(IncomeCategoryResponseMapper.toDto(category));
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('income:update')
  @ApiOperation({
    summary: 'Archive an income category',
    description:
      'Hides an income category for the authenticated user only. Custom categories are archived for everyone who can see them; system categories are hidden just for the requesting user and remain visible to others. Archived categories are hidden from lists. Requires the income:update permission.',
  })
  @ApiParam({ name: 'id', description: 'Income category identifier.' })
  @ApiResponse({
    status: 200,
    description: 'Income category archived successfully.',
    type: IncomeCategoryResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'User lacks the income:update permission.',
  })
  @ApiNotFoundResponse({ description: 'Income category not found.' })
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param('id') categoryId: string,
  ): Promise<ApiSuccessResponse<IncomeCategoryResponseDto>> {
    const category = await this.incomeCategoriesService.archive(
      categoryId,
      request.user.userId,
    );

    return successResponse(IncomeCategoryResponseMapper.toDto(category));
  }
}
