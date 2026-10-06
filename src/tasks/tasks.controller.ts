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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { TaskPageResponseDto } from './dto/task-page-response.dto';
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
  @ApiOperation({ summary: 'List tasks in a project' })
  @ApiOkResponse({
    description: 'A page of tasks matching the supplied filters.',
    type: TaskPageResponseDto,
  })
  findPage(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.findPage(user.userId, projectId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task in a project' })
  @ApiCreatedResponse({ description: 'The task was created.', type: Task })
  create(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.userId, projectId, dto);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task' })
  @ApiOkResponse({ description: 'The requested task.', type: Task })
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.findOne(user.userId, projectId, taskId);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiOkResponse({ description: 'The updated task.', type: Task })
  update(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.userId, projectId, taskId, dto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiOkResponse({ description: 'The task was deleted.' })
  remove(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.remove(user.userId, projectId, taskId);
  }
}
