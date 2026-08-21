export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}
