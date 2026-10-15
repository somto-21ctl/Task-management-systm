import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token returned by POST /auth/login or /auth/refresh.',
    format: 'jwt',
    maxLength: 2048,
  })
  @IsString()
  @IsJWT()
  @MaxLength(2048)
  refreshToken: string;
}
