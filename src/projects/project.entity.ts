import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ format: 'uuid', description: 'Unique project identifier' })
  id: string;

  @Column({ length: 120 })
  @ApiProperty({ example: 'Website redesign', maxLength: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({
    example: 'Plan and track the redesign',
    nullable: true,
  })
  description: string | null;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
  @ApiHideProperty()
  owner: User;

  @OneToMany(() => Task, (task) => task.project)
  @ApiHideProperty()
  tasks: Task[];

  @CreateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
