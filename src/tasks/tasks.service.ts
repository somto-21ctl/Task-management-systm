import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly projects: ProjectsService,
  ) {}

  async findPage(userId: string, projectId: string, query: ListTasksDto) {
    const project = await this.projects.findOneOwned(userId, projectId);
    const where = query.status
      ? { project: { id: project.id }, status: query.status }
      : { project: { id: project.id } };
    const [items, total] = await this.tasks.findAndCount({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { dueDate: query.sortDueDate, createdAt: 'DESC' },
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(userId: string, projectId: string, taskId: string) {
    const task = await this.tasks.findOne({
      where: {
        id: taskId,
        project: { id: projectId, owner: { id: userId } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    const project = await this.projects.findOneOwned(userId, projectId);
    return this.tasks.save(this.tasks.create({ ...dto, project }));
  }

  async update(userId: string, projectId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.findOne(userId, projectId, taskId);
    Object.assign(task, dto);
    return this.tasks.save(task);
  }

  async remove(userId: string, projectId: string, taskId: string) {
    const task = await this.findOne(userId, projectId, taskId);
    await this.tasks.remove(task);
  }
}