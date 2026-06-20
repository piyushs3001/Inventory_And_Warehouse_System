import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

type UserRow = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  passwordHash: string;
  hashedRefreshToken: string | null;
};

type TokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

function sha256(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function makeService(
  user: UserRow | null,
  configValues: Record<string, string> = {},
) {
  const store: { user: UserRow | null; tokens: TokenRow[] } = {
    user,
    tokens: [],
  };
  let tokenSeq = 0;

  const prisma: Record<string, unknown> = {
    user: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(store.user)),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: Partial<UserRow> }) => {
          if (store.user) Object.assign(store.user, data);
          return Promise.resolve(store.user);
        }),
    },
    passwordResetToken: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { tokenHash: string } }) =>
          Promise.resolve(
            store.tokens.find((t) => t.tokenHash === where.tokenHash) ?? null,
          ),
        ),
      create: jest
        .fn()
        .mockImplementation(
          ({ data }: { data: Omit<TokenRow, 'id' | 'usedAt'> }) => {
            const row: TokenRow = {
              id: `t${++tokenSeq}`,
              usedAt: null,
              ...data,
            };
            store.tokens.push(row);
            return Promise.resolve(row);
          },
        ),
      deleteMany: jest
        .fn()
        .mockImplementation(({ where }: { where: { userId: string } }) => {
          store.tokens = store.tokens.filter((t) => t.userId !== where.userId);
          return Promise.resolve({ count: 0 });
        }),
      update: jest
        .fn()
        .mockImplementation(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<TokenRow>;
          }) => {
            const row = store.tokens.find((t) => t.id === where.id);
            if (row) Object.assign(row, data);
            return Promise.resolve(row);
          },
        ),
    },
  };
  prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);

  const jwt = new JwtService({ secret: 'test' });
  const passwords = new PasswordService();
  const config = {
    getOrThrow: () => 'test-secret',
    get: (key: string) => configValues[key],
  };
  const mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    prisma as never,
    jwt,
    passwords,
    config as never,
    mail as never,
  );
  return { service, prisma, passwords, store, mail };
}

describe('AuthService', () => {
  it('rejects login with wrong password', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('correct');
    const { service } = makeService({
      id: 'u1',
      email: 'a@a.com',
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
      hashedRefreshToken: null,
    });
    await expect(service.login('a@a.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logs in valid user and stores a refresh hash', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('correct');
    const { service, store } = makeService({
      id: 'u1',
      email: 'a@a.com',
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
      hashedRefreshToken: null,
    });
    const tokens = await service.login('a@a.com', 'correct');
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(store.user?.hashedRefreshToken).toEqual(expect.any(String));
  });

  it('refresh fails when no stored token (logged out)', async () => {
    const { service } = makeService({
      id: 'u1',
      email: 'a@a.com',
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: 'x',
      hashedRefreshToken: null,
    });
    await expect(service.refresh('u1', 'whatever')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks a PENDING_APPROVAL user (valid creds) with 403 awaiting approval', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('correct');
    const { service } = makeService({
      id: 'u1',
      email: 'pending@a.com',
      role: Role.STAFF,
      status: UserStatus.PENDING_APPROVAL,
      passwordHash: hash,
      hashedRefreshToken: null,
    });
    await expect(
      service.login('pending@a.com', 'correct'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does NOT reveal pending status on a wrong password (stays generic 401)', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('correct');
    const { service } = makeService({
      id: 'u1',
      email: 'pending@a.com',
      role: Role.STAFF,
      status: UserStatus.PENDING_APPROVAL,
      passwordHash: hash,
      hashedRefreshToken: null,
    });
    await expect(
      service.login('pending@a.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an INACTIVE user generically (401, no status leak)', async () => {
    const passwords = new PasswordService();
    const hash = await passwords.hash('correct');
    const { service } = makeService({
      id: 'u1',
      email: 'gone@a.com',
      role: Role.STAFF,
      status: UserStatus.INACTIVE,
      passwordHash: hash,
      hashedRefreshToken: null,
    });
    await expect(service.login('gone@a.com', 'correct')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  describe('password reset', () => {
    function activeUser(): UserRow {
      return {
        id: 'u1',
        email: 'rosa@a.com',
        role: Role.STAFF,
        status: UserStatus.ACTIVE,
        passwordHash: 'old-hash',
        hashedRefreshToken: 'old-refresh',
      };
    }

    it('creates a token and emails a staff reset link for an ACTIVE user', async () => {
      const { service, store, mail } = makeService(activeUser(), {
        STAFF_APP_URL: 'http://staff.test',
        ADMIN_APP_URL: 'http://admin.test',
      });

      await service.requestPasswordReset('rosa@a.com', 'staff');

      expect(store.tokens).toHaveLength(1);
      expect(store.tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(mail.sendPasswordReset).toHaveBeenCalledTimes(1);
      const [to, url] = mail.sendPasswordReset.mock.calls[0] as [
        string,
        string,
      ];
      expect(to).toBe('rosa@a.com');
      expect(url).toMatch(/^http:\/\/staff\.test\/reset-password\?token=/);
    });

    it('uses the admin base URL when app=admin', async () => {
      const { service, mail } = makeService(activeUser(), {
        STAFF_APP_URL: 'http://staff.test',
        ADMIN_APP_URL: 'http://admin.test',
      });
      await service.requestPasswordReset('rosa@a.com', 'admin');
      const [, url] = mail.sendPasswordReset.mock.calls[0] as [string, string];
      expect(url).toMatch(/^http:\/\/admin\.test\/reset-password\?token=/);
    });

    it('does nothing for an unknown email (no token, no mail)', async () => {
      const { service, store, mail } = makeService(null);
      await service.requestPasswordReset('nobody@a.com', 'staff');
      expect(store.tokens).toHaveLength(0);
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('does nothing for a non-ACTIVE user', async () => {
      const pending = { ...activeUser(), status: UserStatus.PENDING_APPROVAL };
      const { service, store, mail } = makeService(pending);
      await service.requestPasswordReset('rosa@a.com', 'staff');
      expect(store.tokens).toHaveLength(0);
      expect(mail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('invalidates prior outstanding tokens on a new request', async () => {
      const { service, store } = makeService(activeUser());
      await service.requestPasswordReset('rosa@a.com', 'staff');
      await service.requestPasswordReset('rosa@a.com', 'staff');
      expect(store.tokens).toHaveLength(1);
    });

    it('still resolves when sending the email fails', async () => {
      const { service, mail } = makeService(activeUser());
      mail.sendPasswordReset.mockRejectedValueOnce(new Error('smtp down'));
      await expect(
        service.requestPasswordReset('rosa@a.com', 'staff'),
      ).resolves.toBeUndefined();
    });

    it('validateResetToken: true for an unused, unexpired token', async () => {
      const { service, store } = makeService(activeUser());
      store.tokens.push({
        id: 't1',
        userId: 'u1',
        tokenHash: sha256('raw'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      await expect(service.validateResetToken('raw')).resolves.toBe(true);
    });

    it('validateResetToken: false for missing / expired / used', async () => {
      const { service, store } = makeService(activeUser());
      await expect(service.validateResetToken('missing')).resolves.toBe(false);
      store.tokens.push({
        id: 't1',
        userId: 'u1',
        tokenHash: sha256('expired'),
        expiresAt: new Date(Date.now() - 1),
        usedAt: null,
      });
      store.tokens.push({
        id: 't2',
        userId: 'u1',
        tokenHash: sha256('used'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });
      await expect(service.validateResetToken('expired')).resolves.toBe(false);
      await expect(service.validateResetToken('used')).resolves.toBe(false);
    });

    it('resetPassword: updates the hash, marks the token used, clears refresh', async () => {
      const { service, store, passwords } = makeService(activeUser());
      store.tokens.push({
        id: 't1',
        userId: 'u1',
        tokenHash: sha256('raw'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await service.resetPassword('raw', 'newPassword1');

      expect(store.user?.hashedRefreshToken).toBeNull();
      expect(store.tokens[0].usedAt).toBeInstanceOf(Date);
      // New hash verifies against the new password.
      await expect(
        passwords.compare('newPassword1', store.user!.passwordHash),
      ).resolves.toBe(true);
    });

    it('resetPassword: rejects an invalid / expired / used token with 400', async () => {
      const { service, store } = makeService(activeUser());
      await expect(
        service.resetPassword('missing', 'newPassword1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      store.tokens.push({
        id: 't1',
        userId: 'u1',
        tokenHash: sha256('used'),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });
      await expect(
        service.resetPassword('used', 'newPassword1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
