import { ApiProperty } from '@nestjs/swagger';
import { ProjectAssigneeResponseDto } from './project-assignee-response.dto';

export class ProjectAssigneePageResponseDto {
  @ApiProperty({ type: () => ProjectAssigneeResponseDto, isArray: true })
  items: ProjectAssigneeResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  limit: number;
}
