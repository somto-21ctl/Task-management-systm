import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user-role.enum';
import { ListUsersDto } from '../users/dto/list-users.dto';
import { UsersService } from '../users/users.service';
import { AdminUserPageResponseDto } from './dto/admin-user-page-response.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  @ApiOperation({ summary: 'List user accounts (admin only)' })
  @ApiOkResponse({
    description: 'A page of user accounts without password data.',
    type: AdminUserPageResponseDto,
  })
  findUsers(@Query() query: ListUsersDto) {
    return this.users.findPage(query);
  }
}
