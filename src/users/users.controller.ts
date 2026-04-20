import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { RequestWithAuth } from '../auth/auth-context';
import { LoginUserRequestDto } from './dto/login-user.dto';
import { LoginUserResponseDto } from './dto/login-user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @ApiBody({
    type: LoginUserRequestDto,
    examples: {
      androidLogin: {
        summary: 'Android user login',
        value: {
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
      },
      webLogin: {
        summary: 'Web user login',
        value: {
          user_id: 'hashed_phone_value',
          product_name: 'ghabzino',
          platform: 'web',
          login_time: '2026-04-20T10:25:00Z',
          attribution: {
            campaign_name: 'organic',
            source: 'google',
            medium: null,
            referer: 'google.com',
            landing_page: '/bill/water',
            store: null
          },
          metadata: {
            schema_version: '1.0',
            trace_id: 'trace_login_002'
          }
        }
      }
    }
  })
  @ApiCreatedResponse({ type: LoginUserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user login payload.' })
  login(@Body() payload: LoginUserRequestDto, @Req() request: RequestWithAuth): Promise<LoginUserResponseDto> {
    return this.usersService.reportLogin(payload, request.authContext!);
  }
}
