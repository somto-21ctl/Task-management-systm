import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { ListUsersDto } from '../users/dto/list-users.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskReviewStatus, TaskStatus } from './task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly projects: ProjectsService,
    private readonly users: UsersService,
  ) {}

  async findPage(userId: string, projectId: string, query: ListTasksDto) {
    const project = await this.projects.findOneById(projectId);
    const isManager = project.owner.id === userId;
    const where = {
      project: { id: project.id },
      ...(!isManager ? { assignedToUserId: userId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.tasks.findAndCount({
      where,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { dueDate: query.sortDueDate, createdAt: 'DESC' },
    });
    return { items, total, page: query.page, limit: query.limit };
  }

  async findAssignableUsers(
    userId: string,
    projectId: string,
    query: ListUsersDto,
  ) {
    await this.requireProjectManager(userId, projectId);
    return this.users.findAssignableUsers(query.page, query.limit);
  }

  async findOne(userId: string, projectId: string, taskId: string) {
    const task = await this.tasks.findOne({
      where: { id: taskId, project: { id: projectId } },
      relations: { project: { owner: true } },
    });
    if (
      !task ||
      (task.project.owner.id !== userId && task.assignedToUserId !== userId)
    ) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    const project = await this.requireProjectManager(userId, projectId);
    const assignee = await this.users.findAssignableUser(dto.assignedToUserId);
    if (!assignee) throw new NotFoundException('Assignee not found');

    return this.tasks.save(
      this.tasks.create({
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        project,
        assignedToUserId: assignee.id,
        status: TaskStatus.PENDING,
        reviewStatus: TaskReviewStatus.NOT_REVIEWED,
      }),
    );
  }

  async update(
    userId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    const task = await this.findOne(userId, projectId, taskId);
    const isManager = task.project.owner.id === userId;

    if (!isManager) {
      const suppliedFields = Object.keys(dto);
      if (
        task.assignedToUserId !== userId ||
        suppliedFields.length !== 1 ||
        suppliedFields[0] !== 'status' ||
        !dto.status
      ) {
        throw new ForbiddenException(
          'Assignees may update only the status of their own tasks.',
        );
      }
    } else if (dto.assignedToUserId) {
      const assignee = await this.users.findAssignableUser(
        dto.assignedToUserId,
      );
      if (!assignee) throw new NotFoundException('Assignee not found');
      task.assignedToUserId = assignee.id;
    }

    Object.assign(task, dto);
    task.reviewStatus = TaskReviewStatus.NOT_REVIEWED;
    task.managerFeedback = null;
    task.reviewedAt = null;
    task.reviewedByUserId = null;
    return this.tasks.save(task);
  }

  async review(
    userId: string,
    projectId: string,
    taskId: string,
    dto: ReviewTaskDto,
  ) {
    const task = await this.findOne(userId, projectId, taskId);
    if (task.project.owner.id !== userId) {
      throw new ForbiddenException(
        'Only the project owner can review project tasks.',
      );
    }
    if (task.status !== TaskStatus.DONE) {
      throw new BadRequestException('Only tasks marked done can be reviewed.');
    }

    task.reviewStatus = dto.reviewStatus;
    task.managerFeedback = dto.managerFeedback ?? null;
    task.reviewedByUserId = userId;
    task.reviewedAt = new Date();
    if (dto.reviewStatus === TaskReviewStatus.CHANGES_REQUESTED) {
      task.status = TaskStatus.IN_PROGRESS;
    }
    return this.tasks.save(task);
  }

  async remove(userId: string, projectId: string, taskId: string) {
    const task = await this.findOne(userId, projectId, taskId);
    if (task.project.owner.id !== userId) {
      throw new ForbiddenException(
        'Only the project owner can delete project tasks.',
      );
    }
    await this.tasks.remove(task);
  }

  private async requireProjectManager(userId: string, projectId: string) {
    const project = await this.projects.findOneById(projectId);
    if (project.owner.id !== userId) {
      throw new ForbiddenException(
        'Only the project owner can manage project tasks.',
      );
    }
    return project;
  }
}
