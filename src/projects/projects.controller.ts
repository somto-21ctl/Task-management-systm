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
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator';
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
  @ApiErrorResponses(
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  findAll(@CurrentUser() user: JwtUser) {
    return this.projects.findAllOwned(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({
    description: 'The project was created.',
    type: Project,
  })
  @ApiErrorResponses(
    {
      status: 400,
      description: 'Project name or description failed validation.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.userId, dto);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get a project' })
  @ApiOkResponse({ description: 'The requested project.', type: Project })
  @ApiErrorResponses(
    { status: 400, description: 'projectId is not a valid UUID.' },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 404, description: 'The project does not exist or is not yours.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.findOneOwned(user.userId, projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ description: 'The updated project.', type: Project })
  @ApiErrorResponses(
    {
      status: 400,
      description:
        'projectId or one of the supplied project fields is invalid.',
    },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 404, description: 'The project does not exist or is not yours.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  update(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(user.userId, projectId, dto);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete a project and its tasks' })
  @ApiOkResponse({ description: 'The project and its tasks were deleted.' })
  @ApiErrorResponses(
    { status: 400, description: 'projectId is not a valid UUID.' },
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 404, description: 'The project does not exist or is not yours.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  remove(
    @CurrentUser() user: JwtUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.remove(user.userId, projectId);
  }
}
