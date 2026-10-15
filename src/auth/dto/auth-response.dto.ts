import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'alex@example.com', format: 'email' })
  email: string;

  @ApiProperty({ example: 'Alex Morgan', nullable: true })
  fullName: string | null;

  @ApiProperty({
    example: '+14155552671',
    nullable: true,
    description: 'E.164 international phone number.',
  })
  phoneNumber: string | null;

  @ApiProperty({ enum: ['admin', 'user'], example: 'user' })
  role: 'admin' | 'user';

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class AuthTokenResponseDto {
  @ApiProperty({
    description: 'Short-lived JWT access token for Bearer authentication.',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Longer-lived refresh token. Store securely and submit to POST /auth/refresh to rotate the token pair.',
  })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({
    example: 900,
    description: 'Access-token lifetime in seconds.',
  })
  expiresIn: number;

  @ApiProperty({
    example: 3600,
    description:
      'Sliding inactivity timeout in seconds. Each authenticated API request extends the session by this amount.',
  })
  sessionIdleTimeoutSeconds: number;
}
