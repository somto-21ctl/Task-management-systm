import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
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
    minLength: 1,
    maxLength: 72,
    description: 'The password used when the account was registered.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
