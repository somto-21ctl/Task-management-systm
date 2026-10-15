import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Single-use reset token from the password-reset email',
    example: 'a'.repeat(64),
    pattern: '^[a-fA-F0-9]{64}$',
  })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  token: string;

  @ApiProperty({
    example: 'NewStrongPassword!2026',
    minLength: 17,
    maxLength: 72,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])[ -~]+$',
    description:
      'Use 17-72 ASCII characters with at least one uppercase letter, lowercase letter, number, and symbol.',
  })
  @IsString()
  @MinLength(17)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[ -~]+$/, {
    message:
      'newPassword must include uppercase and lowercase letters, a number, and a symbol, and contain printable ASCII characters only',
  })
  newPassword: string;
}
