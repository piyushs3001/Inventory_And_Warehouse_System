import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UsersService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
    users = moduleRef.get(UsersService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.warehouse.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.warehouse.deleteMany();
    await app.close();
  });

  it('creates a user without exposing secrets', async () => {
    const u = await users.create({
      name: 'Ann',
      email: 'ann@iws.local',
      password: 'password123',
      role: Role.STAFF,
    });
    expect(u.email).toBe('ann@iws.local');
    expect(u).not.toHaveProperty('passwordHash');
    expect(u).not.toHaveProperty('hashedRefreshToken');
  });

  it('assigns warehouse scope (M:N) and reads it back', async () => {
    const w = await prisma.warehouse.create({ data: { name: 'WH-A' } });
    const u = await users.create({
      name: 'Bob',
      email: 'bob@iws.local',
      password: 'password123',
      role: Role.STAFF,
    });
    await users.setWarehouses(u.id, [w.id]);
    await expect(users.getWarehouseScope(u.id)).resolves.toEqual([w.id]);
  });

  it('deactivate sets status INACTIVE', async () => {
    const u = await users.create({
      name: 'Cal',
      email: 'cal@iws.local',
      password: 'password123',
    });
    const d = await users.deactivate(u.id);
    expect(d.status).toBe(UserStatus.INACTIVE);
  });
});
