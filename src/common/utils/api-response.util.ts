import { ApiResponse } from '../interfaces/api-response.interface';

export const successResponse = <T>(
  data: T,
  meta: Record<string, unknown> = {},
): ApiResponse<T> => {
  return {
    success: true,
    data,
    meta,
  };
};
