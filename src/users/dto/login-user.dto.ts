import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { RequestIdentityDto } from '../../common/dto/envelope.dto';

export class LoginAttributionDto {
  @ApiPropertyOptional({ example: 'Esfand1404_newservice_promotion', nullable: true })
  @IsOptional()
  campaign_name?: string | null;

  @ApiPropertyOptional({ example: 'yektanet', nullable: true })
  @IsOptional()
  source?: string | null;

  @ApiPropertyOptional({ example: 'banner', nullable: true })
  @IsOptional()
  medium?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  referer?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  landing_page?: string | null;

  @ApiPropertyOptional({ example: 'cafebazaar', nullable: true })
  @IsOptional()
  store?: string | null;
}

export class LoginMetadataDto {
  @ApiPropertyOptional({ example: '1.0' })
  @IsOptional()
  @IsString()
  schema_version?: string;

  @ApiPropertyOptional({ example: 'trace_login_001', nullable: true })
  @IsOptional()
  @IsString()
  trace_id?: string | null;
}

export class LoginUserRequestDto {
  @ApiProperty({ example: 'hashed_phone_value' })
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ example: 'ghabzino' })
  @IsString()
  @IsNotEmpty()
  product_name!: string;

  @ApiProperty({ enum: ['web', 'android', 'ios', 'backend'], example: 'android' })
  @IsString()
  @IsIn(['web', 'android', 'ios', 'backend'])
  platform!: 'web' | 'android' | 'ios' | 'backend';

  @ApiProperty({ example: '2026-04-20T10:25:00Z' })
  @IsString()
  @IsNotEmpty()
  login_time!: string;

  @ApiPropertyOptional({ type: () => LoginAttributionDto })
  @IsOptional()
  @IsObject()
  attribution?: LoginAttributionDto;

  @ApiPropertyOptional({ type: () => LoginMetadataDto })
  @IsOptional()
  @IsObject()
  metadata?: LoginMetadataDto;
}

export class LoginUserEnvelopeRequestDto {
  @ApiPropertyOptional({ type: () => RequestIdentityDto })
  @IsOptional()
  @ValidateNested()
  @IsObject()
  Identity?: RequestIdentityDto;

  @ApiProperty({ type: () => LoginUserRequestDto })
  @ValidateNested()
  @IsObject()
  Parameters!: LoginUserRequestDto;
}
