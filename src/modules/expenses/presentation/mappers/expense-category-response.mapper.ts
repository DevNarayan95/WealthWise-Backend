import { ExpenseCategory } from '../../domain/entities/expense-category.entity';
import { ExpenseCategoryResponseDto } from '../dto/expense-category-response.dto';

export class ExpenseCategoryResponseMapper {
  static toDto(category: ExpenseCategory): ExpenseCategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      isSystem: category.isSystem,
      isArchived: category.isArchived,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static toDtoList(
    categories: ExpenseCategory[],
  ): ExpenseCategoryResponseDto[] {
    return categories.map((category) => this.toDto(category));
  }
}
