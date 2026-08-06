import { ErrorCode } from '../constants/error-code.constant';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
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
