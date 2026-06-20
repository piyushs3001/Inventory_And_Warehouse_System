import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Brute-force guard on credential endpoints: 10 attempts/min/IP in real
// environments; effectively disabled under test so the serial e2e suite (which
// logs in many times from one IP) isn't rate-limited.
const AUTH_THROTTLE = {
  default: {
    ttl: 60_000,
    limit: process.env.NODE_ENV === 'test' ? 100_000 : 10,
  },
};
import { TokensDto } from './dto/tokens.dto';
import { UserDto } from '../users/dto/user.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import type { JwtPayload, RequestUserWithRefresh, Tokens } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description: 'Exchange email + password for an access/refresh token pair.',
  })
  @ApiOkResponse({ type: TokensDto })
  @ApiValidationError()
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid email or password.',
  })
  login(@Body() dto: LoginDto): Promise<Tokens> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Self-register',
    description:
      'Create a self-service account. Always STAFF with no warehouse scope and ' +
      'PENDING_APPROVAL status — a Super Admin must approve and assign scope ' +
      'before sign-in works. Returns no tokens.',
  })
  @ApiCreatedResponse({ type: UserDto })
  @ApiValidationError()
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Email already in use.',
  })
  register(@Body() dto: RegisterDto) {
    return this.users.registerSelfSignup(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Rotate the token pair using a valid refresh token (sent as the bearer token).',
  })
  @ApiOkResponse({ type: TokensDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing, invalid, or expired refresh token.',
  })
  refresh(@CurrentUser() user: RequestUserWithRefresh): Promise<Tokens> {
    return this.auth.refresh(user.sub, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Log out',
    description: 'Invalidate the stored refresh token for the current user.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedTokenError()
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.auth.logout(user.sub);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Current user',
    description: 'Return the authenticated user with their warehouse scope.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedTokenError()
  me(@CurrentUser() user: JwtPayload) {
    return this.users.findOne(user.sub);
  }
}
