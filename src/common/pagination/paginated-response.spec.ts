import { buildPaginatedResponse } from './paginated-response';

describe('paginated-response', () => {
  describe('buildPaginatedResponse', () => {
    it('should wrap items under data.items and describe the page in meta', () => {
      const items = [{ id: 'a' }, { id: 'b' }];

      expect(
        buildPaginatedResponse({ items, page: 1, limit: 2, total: 3 }),
      ).toEqual({
        success: true,
        data: { items },
        meta: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      });
    });

    it('should return an empty items array with zeroed meta when nothing matches', () => {
      expect(
        buildPaginatedResponse({ items: [], page: 1, limit: 20, total: 0 }),
      ).toEqual({
        success: true,
        data: { items: [] },
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });
});
