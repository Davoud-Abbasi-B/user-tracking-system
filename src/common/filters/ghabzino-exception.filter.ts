import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { mapHttpStatusToGhabzinoCode } from '../utils/ghabzino-status.util';

type LegacyErrorPayload = {
  message?: string | string[];
};

@Catch()
export class GhabzinoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let description = 'internal server error';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const payload = exception.getResponse() as string | LegacyErrorPayload;
      if (typeof payload === 'string') {
        description = payload;
      } else if (Array.isArray(payload?.message)) {
        description = payload.message.join(', ');
      } else if (payload?.message) {
        description = payload.message;
      } else {
        description = exception.message;
      }
    }

    response.status(httpStatus).json({
      Status: {
        Code: mapHttpStatusToGhabzinoCode(httpStatus),
        Description: description
      },
      Parameters: null
    });
  }
}
