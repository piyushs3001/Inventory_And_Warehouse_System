import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { JwtPayload, Tokens } from './auth.types';

@Injectable()
export class AuthService {
  private readonly accessTtl = '15m';
  private readonly refreshTtl = '7d';
  // A valid bcrypt hash compared against when the email is unknown, so login
  // takes ~the same time whether or not the user exists (no timing enumeration).
  private readonly dummyHash =
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always run a compare (against a dummy hash when the email is unknown) so
    // response time doesn't reveal whether the account exists.
    const passwordOk = await this.passwords.compare(
      password,
      user?.passwordHash ?? this.dummyHash,
    );
    // Generic message until credentials prove out — no user enumeration.
    if (!user || !passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Only revealed to a caller who already holds valid credentials.
    if (user.status === UserStatus.PENDING_APPROVAL) {
      throw new ForbiddenException(
        'Your account is awaiting administrator approval.',
      );
    }
    // Deactivated (or any non-active) accounts stay generic.
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.storeRefreshHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Re-check status here: a deactivated/pending account must not be able to
    // mint fresh access tokens off an old refresh token until its 7-day TTL.
    if (
      !user ||
      !user.hashedRefreshToken ||
      user.status !== UserStatus.ACTIVE
    ) {
      throw new ForbiddenException('Access denied');
    }
    const matches = await this.passwords.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!matches) throw new ForbiddenException('Access denied');

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    await this.storeRefreshHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<Tokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.accessTtl,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTtl,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshHash(userId: string, token: string): Promise<void> {
    const hashedRefreshToken = await this.passwords.hash(token);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }
}
