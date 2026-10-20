import { IncomeCategory } from '../../domain/entities/income-category.entity';
import { IncomeCategoryResponseDto } from '../dto/income-category-response.dto';

export class IncomeCategoryResponseMapper {
  static toDto(category: IncomeCategory): IncomeCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      isSystem: category.isSystem,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static toDtoList(categories: IncomeCategory[]): IncomeCategoryResponseDto[] {
    return categories.map((category) => this.toDto(category));
  }
}
