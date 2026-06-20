import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PasswordService } from './password.service';
import { JwtPayload, Tokens } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtl = '15m';
  private readonly refreshTtl = '7d';
  // Password-reset tokens live for one hour and can be used once.
  private readonly resetTtlMs = 60 * 60 * 1000;
  // A valid bcrypt hash compared against when the email is unknown, so login
  // takes ~the same time whether or not the user exists (no timing enumeration).
  private readonly dummyHash =
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
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

  /**
   * Begin a password reset. Always resolves without revealing whether the email
   * maps to an account (no enumeration). Only ACTIVE users get an email; a new
   * request invalidates the user's prior outstanding tokens.
   */
  async requestPasswordReset(
    email: string,
    app: 'staff' | 'admin',
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) return;

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + this.resetTtlMs),
      },
    });

    const resetUrl = `${this.appBaseUrl(app)}/reset-password?token=${rawToken}`;
    try {
      await this.mail.sendPasswordReset(user.email, resetUrl);
    } catch (err) {
      // Never surface mail failures to the caller — the response stays generic.
      this.logger.error('Failed to send password-reset email', err as Error);
    }
  }

  /** True when the token exists, is unused, and has not expired. */
  async validateResetToken(token: string): Promise<boolean> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    return this.isTokenUsable(row);
  }

  /**
   * Consume a reset token: set the new password, mark the token used, and clear
   * any stored refresh token (logging out existing sessions) — all atomically.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (!this.isTokenUsable(row) || !row) {
      throw new BadRequestException(
        'This reset link is invalid or has expired.',
      );
    }

    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash, hashedRefreshToken: null },
      });
      await tx.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
    });
  }

  private isTokenUsable(
    row: { expiresAt: Date; usedAt: Date | null } | null,
  ): boolean {
    return Boolean(row && !row.usedAt && row.expiresAt.getTime() > Date.now());
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private appBaseUrl(app: 'staff' | 'admin'): string {
    return app === 'admin'
      ? (this.config.get<string>('ADMIN_APP_URL') ?? 'http://localhost:5001')
      : (this.config.get<string>('STAFF_APP_URL') ?? 'http://localhost:5000');
  }
}
