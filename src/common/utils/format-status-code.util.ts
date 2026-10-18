export interface StatusCodeFormat {
  prefix: string;
  separator: string;
}

/**
 * Builds the public `statusCode` value returned in the error envelope,
 * for example `WS404`. The real HTTP status is still sent on the response.
 */
export const formatStatusCode = (
  httpStatus: number,
  format: StatusCodeFormat,
): string => `${format.prefix}${format.separator}${httpStatus}`;
