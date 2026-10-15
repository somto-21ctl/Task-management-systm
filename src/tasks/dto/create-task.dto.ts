import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    description:
      'Required task title; leading and trailing whitespace is removed.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({
    maxLength: 5000,
    description:
      'Optional task description; leading and trailing whitespace is removed.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'UUID UID of the user assigned by the project owner. Newly created tasks always start as pending.',
    example: '7e5c785b-7351-4adf-ae92-b5eb93983bb4',
  })
  @IsUUID()
  assignedToUserId: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    format: 'date',
    description: 'Due date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;
}
