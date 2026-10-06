import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'alex@example.com', format: 'email' })
  email: string;

  @ApiProperty({ enum: ['admin', 'user'], example: 'user' })
  role: 'admin' | 'user';

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class AuthTokenResponseDto {
  @ApiProperty({ description: 'JWT access token for bearer authentication' })
  accessToken: string;
}
