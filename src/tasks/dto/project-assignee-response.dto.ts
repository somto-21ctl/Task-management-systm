import { ApiProperty } from '@nestjs/swagger';

export class ProjectAssigneeResponseDto {
  @ApiProperty({ format: 'uuid', description: 'User UID for task assignment.' })
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ example: 'Alex Morgan', nullable: true })
  fullName: string | null;
}
