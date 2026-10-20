import { ApiResponse } from '../interfaces/api-response.interface';
import { successResponse } from '../utils/api-response.util';
import { buildPaginationMeta, PaginationInput } from './pagination-meta';

export interface PaginatedData<T> {
  items: T[];
}

export const buildPaginatedResponse = <T>({
  items,
  ...pagination
}: PaginationInput & {
  items: T[];
}): ApiResponse<PaginatedData<T>> =>
  successResponse<PaginatedData<T>>({ items }, buildPaginationMeta(pagination));
