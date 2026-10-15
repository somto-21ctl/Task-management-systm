import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inProgress',
  DONE = 'done',
}

export enum TaskReviewStatus {
  NOT_REVIEWED = 'notReviewed',
  APPROVED = 'approved',
  CHANGES_REQUESTED = 'changesRequested',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ format: 'uuid', description: 'Unique task identifier' })
  id: string;

  @Column({ length: 120 })
  @ApiProperty({ example: 'Review the project plan', maxLength: 120 })
  title: string;

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({
    type: String,
    example: 'Collect feedback from the team',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status',
    default: TaskStatus.PENDING,
  })
  @ApiProperty({
    enum: TaskStatus,
    default: TaskStatus.PENDING,
    description: 'Assignee-managed task state.',
  })
  status: TaskStatus;

  @Column({ type: 'uuid' })
  @ApiProperty({
    format: 'uuid',
    description: 'UID of the user assigned to this task.',
  })
  assignedToUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assignedToUserId' })
  @ApiHideProperty()
  assignedTo: User;

  @Column({
    type: 'varchar',
    length: 24,
    default: TaskReviewStatus.NOT_REVIEWED,
  })
  @ApiProperty({
    enum: TaskReviewStatus,
    default: TaskReviewStatus.NOT_REVIEWED,
    description: 'Review state set by the project owner.',
  })
  reviewStatus: TaskReviewStatus;

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Optional feedback provided during manager review.',
  })
  managerFeedback: string | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'UID of the project owner who last reviewed this task.',
  })
  reviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedByUserId' })
  @ApiHideProperty()
  reviewedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Timestamp of the most recent manager review.',
  })
  reviewedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  @ApiPropertyOptional({
    type: String,
    example: '2026-12-31',
    format: 'date',
    nullable: true,
  })
  dueDate: string | null;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @ApiHideProperty()
  project: Project;

  @CreateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
