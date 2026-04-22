import { Body, Controller, Post, Req, UseFilters } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags
} from '@nestjs/swagger';
import { RequestWithAuth } from '../auth/auth-context';
import { ErrorEnvelopeResponseDto } from '../common/dto/envelope.dto';
import { GhabzinoExceptionFilter } from '../common/filters/ghabzino-exception.filter';
import { createSuccessStatus } from '../common/utils/ghabzino-status.util';
import { LoginUserEnvelopeResponseDto, LoginUserResponseDto } from './dto/login-user-response.dto';
import { LoginUserEnvelopeRequestDto } from './dto/login-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseFilters(GhabzinoExceptionFilter)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @ApiBody({
    type: LoginUserEnvelopeRequestDto,
    examples: {
      androidLogin: {
        summary: 'Android user login envelope',
        value: {
          Identity: {
            Token: 'E61165CBE2B74373B90EBA23C6805412'
          },
          Parameters: {
            user_id: 'hashed_phone_value',
            product_name: 'ghabzino',
            platform: 'android',
            login_time: '2026-04-20T10:25:00Z',
            attribution: {
              campaign_name: 'Esfand1404_newservice_promotion',
              source: 'yektanet',
              medium: 'banner',
              referer: null,
              landing_page: null,
              store: 'cafebazaar'
            },
            metadata: {
              schema_version: '1.0',
              trace_id: 'trace_login_001'
            }
          }
        }
      }
    }
  })
  @ApiCreatedResponse({ type: LoginUserEnvelopeResponseDto })
  @ApiBadRequestResponse({ type: ErrorEnvelopeResponseDto, description: 'Invalid user login payload.' })
  @ApiUnauthorizedResponse({ type: ErrorEnvelopeResponseDto, description: 'x-api-key missing or invalid.' })
  @ApiForbiddenResponse({ type: ErrorEnvelopeResponseDto, description: 'Trust-boundary violation.' })
  @ApiTooManyRequestsResponse({ type: ErrorEnvelopeResponseDto, description: 'Rate limit exceeded.' })
  async login(
    @Body() envelope: LoginUserEnvelopeRequestDto,
    @Req() request: RequestWithAuth
  ): Promise<LoginUserEnvelopeResponseDto> {
    const result: LoginUserResponseDto = await this.usersService.reportLogin(envelope.Parameters, request.authContext!);

    return {
      Status: createSuccessStatus(
        result.action === 'created' ? 'User login reported successfully.' : 'User login updated successfully.'
      ),
      Parameters: result
    };
  }
}
