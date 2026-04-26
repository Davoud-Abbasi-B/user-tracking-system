import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @ApiProperty({ type: () => ErrorResponseStatusDto })
  Status!: ErrorResponseStatusDto;

  @ApiProperty({ type: String, nullable: true, example: null, description: 'Always null in error responses.' })
  Parameters!: null;
}
