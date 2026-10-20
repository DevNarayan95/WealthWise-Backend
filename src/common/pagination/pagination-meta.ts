export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export interface PaginationInput {
  page: number;
  limit: number;
  total: number;
}

export const buildPaginationMeta = ({
  page,
  limit,
  total,
}: PaginationInput): PaginationMeta => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
