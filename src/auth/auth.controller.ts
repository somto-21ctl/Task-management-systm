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
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator';
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
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
  @ApiErrorResponses(
    {
      status: 400,
      description:
        'Email, password, fullName, or phoneNumber failed validation.',
    },
    { status: 409, description: 'An account with this email already exists.' },
    { status: 429, description: 'Too many registration attempts.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login and receive a bearer token' })
  @ApiOkResponse({
    description:
      'Credentials accepted. Use the returned accessToken as a Bearer token.',
    type: AuthTokenResponseDto,
  })
  @ApiErrorResponses(
    { status: 400, description: 'Email or password failed validation.' },
    { status: 401, description: 'Email or password is incorrect.' },
    { status: 429, description: 'Too many login attempts.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate the refresh token and extend the active session',
  })
  @ApiOkResponse({
    description:
      'Returns a new accessToken and refreshToken. The submitted refresh token is invalidated. Refresh during active use before accessToken expires; the session ends after one hour without API activity.',
    type: AuthTokenResponseDto,
  })
  @ApiErrorResponses(
    { status: 400, description: 'refreshToken is missing or malformed.' },
    {
      status: 401,
      description: 'Refresh token is invalid, expired, or already used.',
    },
    { status: 429, description: 'Too many token refresh attempts.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token and log out' })
  @ApiOkResponse({
    description:
      'The refresh token and its session are revoked immediately. Repeating this request is safe.',
    type: AuthMessageResponseDto,
  })
  @ApiErrorResponses(
    { status: 400, description: 'refreshToken is missing or malformed.' },
    { status: 429, description: 'The API rate limit has been exceeded.' },
    { status: 500, description: 'Unexpected server error.' },
  )
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto);
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
  @ApiErrorResponses(
    { status: 400, description: 'Email failed validation.' },
    { status: 429, description: 'Too many password-reset requests.' },
    {
      status: 503,
      description: 'Password-reset email delivery is unavailable.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
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
  @ApiErrorResponses(
    {
      status: 400,
      description:
        'Request validation failed, or the reset token is invalid or expired.',
    },
    { status: 429, description: 'Too many password-reset attempts.' },
    { status: 500, description: 'Unexpected server error.' },
  )
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
  @ApiErrorResponses(
    {
      status: 401,
      description: 'Bearer token is missing, invalid, or expired.',
    },
    { status: 500, description: 'Unexpected server error.' },
  )
  me(@CurrentUser() user: JwtUser) {
    return this.auth.getProfile(user.userId);
  }
}
