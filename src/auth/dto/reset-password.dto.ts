import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Single-use reset token from the password-reset email',
    example: 'a'.repeat(64),
  })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  token: string;

  @ApiProperty({ minLength: 12, maxLength: 72 })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  newPassword: string;
}
