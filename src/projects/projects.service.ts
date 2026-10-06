import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(@InjectRepository(Project) private readonly projects: Repository<Project>) {}

  findAllOwned(userId: string) {
    return this.projects.find({
      where: { owner: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneOwned(userId: string, projectId: string) {
    const project = await this.projects.findOne({
      where: { id: projectId, owner: { id: userId } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = this.projects.create({
      ...dto,
      owner: { id: userId } as User,
    });
    return this.projects.save(project);
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.findOneOwned(userId, projectId);
    Object.assign(project, dto);
    return this.projects.save(project);
  }

  async remove(userId: string, projectId: string) {
    const project = await this.findOneOwned(userId, projectId);
    await this.projects.remove(project);
  }
}