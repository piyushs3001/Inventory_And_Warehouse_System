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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { UserDto } from '../users/dto/user.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApiValidationError } from '../common/decorators/api-errors.decorators';
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
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid access token.',
  })
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
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing or invalid access token.',
  })
  me(@CurrentUser() user: JwtPayload) {
    return this.users.findOne(user.sub);
  }
}
