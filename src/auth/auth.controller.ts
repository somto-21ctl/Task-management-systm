import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { AuthService } from './auth.service';
import { AuthMessageResponseDto } from './dto/auth-message-response.dto';
import {
  AuthTokenResponseDto,
  PublicUserResponseDto,
} from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a user' })
  @ApiCreatedResponse({
    description: 'The account was created.',
    type: PublicUserResponseDto,
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login and receive a bearer token' })
  @ApiCreatedResponse({
    description: 'Credentials accepted.',
    type: AuthTokenResponseDto,
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiAcceptedResponse({
    description:
      'A generic response that does not reveal whether the email is registered.',
    type: AuthMessageResponseDto,
  })
  requestPasswordReset(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset a password using an email token' })
  @ApiOkResponse({
    description: 'The password was reset.',
    type: AuthMessageResponseDto,
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({
    description: 'The authenticated user profile.',
    type: PublicUserResponseDto,
  })
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getProfile(user.userId);
  }
}
