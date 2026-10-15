import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TaskReviewStatus } from '../task.entity';

export class ReviewTaskDto {
  @ApiProperty({
    enum: [TaskReviewStatus.APPROVED, TaskReviewStatus.CHANGES_REQUESTED],
    description:
      'Project manager decision. A changesRequested decision returns the task to inProgress.',
  })
  @IsIn([TaskReviewStatus.APPROVED, TaskReviewStatus.CHANGES_REQUESTED])
  reviewStatus: TaskReviewStatus.APPROVED | TaskReviewStatus.CHANGES_REQUESTED;

  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Optional feedback visible to the assignee.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  managerFeedback?: string;
}
