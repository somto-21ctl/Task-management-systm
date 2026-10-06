import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 12, maxLength: 72 })
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password: string;
}