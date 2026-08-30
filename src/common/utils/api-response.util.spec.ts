import { successResponse } from './api-response.util';

describe('successResponse', () => {
  it('should create a successful API response', () => {
    const data = {
      id: 'user-id',
      email: 'test@example.com',
    };

    expect(successResponse(data)).toEqual({
      success: true,
      data,
      meta: {},
    });
  });

  it('should include metadata when provided', () => {
    const data = ['user-1', 'user-2'];

    const meta = {
      page: 1,
      limit: 20,
      total: 2,
    };

    expect(successResponse(data, meta)).toEqual({
      success: true,
      data,
      meta,
    });
  });
});
