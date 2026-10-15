import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'alex@example.com',
    maxLength: 255,
    description: 'Email address; leading and trailing whitespace is removed.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'StrongPassword!2026',
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
      'password must include uppercase and lowercase letters, a number, and a symbol, and contain printable ASCII characters only',
  })
  password: string;

  @ApiProperty({
    example: 'Alex Morgan',
    minLength: 2,
    maxLength: 100,
    description:
      'Required full name. Letters, spaces, apostrophes, and hyphens only.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u, {
    message:
      'fullName may contain letters, spaces, apostrophes, and hyphens only',
  })
  fullName: string;

  @ApiProperty({
    example: '+14155552671',
    pattern: '^\\+[1-9]\\d{7,14}$',
    description:
      'Required phone number in E.164 format, including country code.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'phoneNumber must be a valid E.164 number, for example +14155552671',
  })
  phoneNumber: string;
}
