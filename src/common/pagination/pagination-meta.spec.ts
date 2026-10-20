import { buildPaginationMeta } from './pagination-meta';

describe('pagination-meta', () => {
  describe('buildPaginationMeta', () => {
    it('should describe a first page with more pages to follow', () => {
      expect(buildPaginationMeta({ page: 1, limit: 20, total: 42 })).toEqual({
        page: 1,
        limit: 20,
        total: 42,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should describe a middle page with both adjacent pages', () => {
      expect(buildPaginationMeta({ page: 2, limit: 20, total: 42 })).toEqual({
        page: 2,
        limit: 20,
        total: 42,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should describe the last page with no next page', () => {
      expect(buildPaginationMeta({ page: 3, limit: 20, total: 42 })).toEqual({
        page: 3,
        limit: 20,
        total: 42,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should report zero pages when there are no items', () => {
      expect(buildPaginationMeta({ page: 1, limit: 20, total: 0 })).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should report an exact multiple of the limit without an extra page', () => {
      expect(buildPaginationMeta({ page: 1, limit: 10, total: 20 })).toEqual(
        expect.objectContaining({ totalPages: 2, hasNextPage: true }),
      );
    });
  });
});
