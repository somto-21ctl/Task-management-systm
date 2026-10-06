import { ApiProperty } from '@nestjs/swagger';
import { Task } from '../task.entity';

export class TaskPageResponseDto {
  @ApiProperty({
    type: () => Task,
    isArray: true,
    description: 'Tasks in this page',
  })
  items: Task[];

  @ApiProperty({
    example: 42,
    description: 'Total matching tasks across all pages',
  })
  total: number;

  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  limit: number;
}
