import { ApiProperty } from '@nestjs/swagger';

export class AuthMessageResponseDto {
  @ApiProperty({
    example:
      'If an account exists for that email, a password reset link will be sent.',
  })
  message: string;
}
