import {
  Column,
  CreateDateColumn,
  Entity,
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

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
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
    example: 'Collect feedback from the team',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status',
    default: TaskStatus.TODO,
  })
  @ApiProperty({ enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'date', nullable: true })
  @ApiPropertyOptional({
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
