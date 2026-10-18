import { ErrorCode } from '../constants/error-code.constant';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  /** Configured prefix plus HTTP status, e.g. `WS404`. Also sent as the HTTP status code. */
  statusCode: string;
  error: {
    /** Stable application error code, e.g. `ACCOUNT_NOT_FOUND`. */
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: {
    requestId?: string;
  };
  timestamp: string;
  path: string;
}

export type { ErrorCode };
