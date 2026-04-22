import { ApiProperty } from '@nestjs/swagger';
import { LoginUserResponseStatusDto } from '../../common/dto/envelope.dto';

export class LoginUserResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'hashed_phone_value' })
  user_id!: string;

  @ApiProperty({ enum: ['created', 'updated'], example: 'updated' })
  action!: 'created' | 'updated';

  @ApiProperty({ example: '2026-04-20T10:25:00Z' })
  last_login_at!: string;

  @ApiProperty({ example: 2 })
  login_count!: number;
}

export class LoginUserEnvelopeResponseDto {
  @ApiProperty({ type: LoginUserResponseStatusDto })
  Status!: LoginUserResponseStatusDto;

  @ApiProperty({ type: LoginUserResponseDto })
  Parameters!: LoginUserResponseDto;
}
