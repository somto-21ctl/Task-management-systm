import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { ProjectAssigneePageResponseDto } from './dto/project-assignee-page-response.dto';
import { ReviewTaskDto } from './dto/review-task.dto';
import { TaskPageResponseDto } from './dto/task-page-response.dto';
import { ListUsersDto } from '../users/dto/list-users.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List tasks in a project',
    description:
      'Project owners see every project task. Other users see only tasks assigned to their UID.',
  })
  @ApiOkResponse({
    description: 'A page of tasks matching the supplied filters.',
    type: TaskPageResponseDto,
  })
  @ApiErrorResponses(
    {
      status: 400,
      description:
        'projectId or one of the pagination/filter values is invalid.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 404, description: 'The project does not exist.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  findPage(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.findPage(user.userId, projectId, query);
  }

  @Get('assignees')
  @ApiOperation({
    summary: 'List users available for task assignment (project owner only)',
  })
  @ApiOkResponse({
    description: 'A page of users with their UID, email, and fullName.',
    type: ProjectAssigneePageResponseDto,
  })
  @ApiErrorResponses(
    { status: 400, description: 'projectId or pagination values are invalid.' },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 403, description: 'Only the project owner can assign tasks.' },
    { status: 404, description: 'Project not found.' },
  )
  findAssignableUsers(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListUsersDto,
  ) {
    return this.tasks.findAssignableUsers(user.userId, projectId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create and assign a pending task (project owner only)',
    description:
      'The project owner must provide assignedToUserId, the UID returned by the assignees endpoint. New tasks always start with status pending.',
  })
  @ApiCreatedResponse({ description: 'The task was created.', type: Task })
  @ApiErrorResponses(
    {
      status: 400,
      description: 'projectId or one of the supplied task fields is invalid.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 403, description: 'Only the project owner can assign tasks.' },
    { status: 404, description: 'Project or assignee not found.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  create(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.userId, projectId, dto);
  }

  @Get(':taskId')
  @ApiOperation({
    summary: 'Get a task',
    description:
      'Only the project owner or the user assigned to this task can retrieve it.',
  })
  @ApiOkResponse({
    description:
      'The requested task, including its assignment and review state.',
    type: Task,
  })
  @ApiErrorResponses(
    {
      status: 400,
      description: 'projectId or taskId is not a valid UUID.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    {
      status: 404,
      description: 'The task does not exist or is not in this project.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.findOne(user.userId, projectId, taskId);
  }

  @Patch(':taskId')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Assignees may update only status. The project owner may update task details, status, and assignedToUserId.',
  })
  @ApiOkResponse({ description: 'The updated task.', type: Task })
  @ApiErrorResponses(
    {
      status: 400,
      description:
        'projectId, taskId, or one of the supplied task fields is invalid.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    {
      status: 403,
      description:
        'Assignees may update only status; project owners manage task details.',
    },
    {
      status: 404,
      description: 'The task or requested assignee does not exist.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  update(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.userId, projectId, taskId, dto);
  }

  @Patch(':taskId/review')
  @ApiOperation({
    summary: 'Review a completed task (project owner only)',
    description:
      'Approve the completed task or request changes. A changesRequested decision returns its status to inProgress.',
  })
  @ApiOkResponse({
    description: 'The task including its review decision and feedback.',
    type: Task,
  })
  @ApiErrorResponses(
    {
      status: 400,
      description: 'Task is not done or review input is invalid.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 403, description: 'Only the project owner can review tasks.' },
    { status: 404, description: 'Task not found.' },
  )
  review(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: ReviewTaskDto,
  ) {
    return this.tasks.review(user.userId, projectId, taskId, dto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiOkResponse({ description: 'The task was deleted.' })
  @ApiErrorResponses(
    {
      status: 400,
      description: 'projectId or taskId is not a valid UUID.',
    },
    {
      status: 403,
      description: 'Only the project owner can manage project tasks.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    {
      status: 404,
      description: 'The task does not exist or is not in this project.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  remove(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.remove(user.userId, projectId, taskId);
  }
}
