import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
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

function makeService(user: UserRow | null) {
  const store = { user };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(store.user),
      update: jest.fn().mockImplementation(({ data }: { data: Partial<UserRow> }) => {
        if (store.user) Object.assign(store.user, data);
        return Promise.resolve(store.user);
      }),
    },
  };
  const jwt = new JwtService({ secret: 'test' });
  const passwords = new PasswordService();
  const config = { getOrThrow: () => 'test-secret' };
  const service = new AuthService(
    prisma as never,
    jwt,
    passwords,
    config as never,
  );
  return { service, prisma, passwords, store };
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
});
