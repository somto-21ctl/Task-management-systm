import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Project } from '../projects/project.entity';
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ format: 'uuid', description: 'Unique user identifier' })
  id: string;

  @Column({ unique: true, length: 255 })
  @ApiProperty({ example: 'alex@example.com', format: 'email' })
  email: string;

  @Column({ select: false })
  @ApiHideProperty()
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: UserRole.USER })
  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Project, (project) => project.owner)
  @ApiHideProperty()
  projects: Project[];

  @CreateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
