import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './project.entity';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's projects" })
  @ApiOkResponse({
    description: 'Projects owned by the authenticated user.',
    type: Project,
    isArray: true,
  })
  findAll(@CurrentUser() user: JwtUser) {
    return this.projects.findAllOwned(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({
    description: 'The project was created.',
    type: Project,
  })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.userId, dto);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get a project' })
  @ApiOkResponse({ description: 'The requested project.', type: Project })
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.findOneOwned(user.userId, projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ description: 'The updated project.', type: Project })
  update(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(user.userId, projectId, dto);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete a project and its tasks' })
  @ApiOkResponse({ description: 'The project was deleted.' })
  remove(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.remove(user.userId, projectId);
  }
}
