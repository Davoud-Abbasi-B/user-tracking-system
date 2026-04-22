import { HttpStatus } from '@nestjs/common';

export const GHABZINO_STATUS_CODE = {
  SUCCESS: 'G00000',
  VALIDATION_ERROR: 'G00001',
  UNAUTHORIZED: 'G00002',
  FORBIDDEN: 'G00003',
  RATE_LIMITED: 'G00004',
  CONFLICT: 'G00005',
  INTERNAL_ERROR: 'G00006'
} as const;

export type GhabzinoStatusCode = (typeof GHABZINO_STATUS_CODE)[keyof typeof GHABZINO_STATUS_CODE];

export function mapHttpStatusToGhabzinoCode(status: number): GhabzinoStatusCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return GHABZINO_STATUS_CODE.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return GHABZINO_STATUS_CODE.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return GHABZINO_STATUS_CODE.FORBIDDEN;
    case HttpStatus.TOO_MANY_REQUESTS:
      return GHABZINO_STATUS_CODE.RATE_LIMITED;
    case HttpStatus.CONFLICT:
      return GHABZINO_STATUS_CODE.CONFLICT;
    default:
      return GHABZINO_STATUS_CODE.INTERNAL_ERROR;
  }
}

export function createSuccessStatus(description: string) {
  return {
    Code: GHABZINO_STATUS_CODE.SUCCESS,
    Description: description
  };
}
