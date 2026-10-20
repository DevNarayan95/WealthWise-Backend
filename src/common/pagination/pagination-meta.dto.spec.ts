import { DECORATORS } from '@nestjs/swagger';

import { PaginationMetaDto } from './pagination-meta.dto';

describe('PaginationMetaDto', () => {
  it('should document every pagination meta field in Swagger', () => {
    const documented: string[] =
      Reflect.getMetadata(
        DECORATORS.API_MODEL_PROPERTIES_ARRAY,
        PaginationMetaDto.prototype,
      ) ?? [];

    expect(documented.map((key) => key.replace(/^:/, '')).sort()).toEqual(
      [
        'hasNextPage',
        'hasPreviousPage',
        'limit',
        'page',
        'total',
        'totalPages',
      ].sort(),
    );
  });
});
