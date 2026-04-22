import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class RequestIdentityDto {
  @ApiPropertyOptional({ example: 'E61165CBE2B74373B90EBA23C6805412', nullable: true })
  @IsOptional()
  @IsString()
  Token?: string | null;
}

export class RequestStatusDto {
  @ApiProperty({ example: 'G00000' })
  @IsString()
  @IsNotEmpty()
  Code!: string;

  @ApiProperty({ example: 'Operation completed successfully.' })
  @IsString()
  @IsNotEmpty()
  Description!: string;
}

export class EventIngestResponseStatusDto {
  @ApiProperty({ example: 'G00000' })
  Code!: string;

  @ApiProperty({ example: 'Event accepted successfully.' })
  Description!: string;
}

export class LoginUserResponseStatusDto {
  @ApiProperty({ example: 'G00000' })
  Code!: string;

  @ApiProperty({ example: 'User login reported successfully.' })
  Description!: string;
}

export class ErrorResponseStatusDto {
  @ApiProperty({ example: 'G00001' })
  Code!: string;

  @ApiProperty({ example: 'event name must exist in registry' })
  Description!: string;
}

export class ErrorEnvelopeResponseDto {
  @ApiProperty({ type: ErrorResponseStatusDto })
  Status!: ErrorResponseStatusDto;

  @ApiProperty({ nullable: true, example: null })
  Parameters!: null;
}

export class RequestEnvelopeDto<TParameters> {
  @ApiPropertyOptional({ type: RequestIdentityDto })
  @IsOptional()
  @ValidateNested()
  @IsObject()
  Identity?: RequestIdentityDto;

  @ApiProperty({ description: 'Endpoint-specific parameters object.' })
  @IsObject()
  Parameters!: TParameters;
}

export class ResponseEnvelopeDto<TParameters> {
  @ApiProperty({ type: RequestStatusDto })
  @ValidateNested()
  Status!: RequestStatusDto;

  @ApiProperty({ nullable: true })
  Parameters!: TParameters | null;
}
