import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiErrorResponse, ErrorCode } from '../interfaces/api-response.interface';

/**
 * Global exception filter that transforms all exceptions into the standard API error shape
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = this.mapStatusToErrorCode(status);

      const payload = exception.getResponse();
      const extracted = this.extractMessage(payload);
      if (extracted) message = extracted;
    }

    const body: ApiErrorResponse = {
      data: null,
      error: { code, message },
    };

    res.status(status).send(body);
  }

  private extractMessage(payload: unknown): string | null {
    if (typeof payload === 'string') return payload;

    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      const msg = obj.message;

      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.filter((x) => typeof x === 'string').join(', ');
    }

    return null;
  }

  /**
   * Maps HTTP status codes to application error codes
   */
  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}