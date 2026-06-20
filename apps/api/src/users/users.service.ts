import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser, userSafeSelect } from './users.select';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Admin-created user (role chosen by the admin; ACTIVE by schema default). */
  create(dto: CreateUserDto): Promise<SafeUser> {
    return this.createWithPassword({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
  }

  /**
   * Public self-registration. Always STAFF, no warehouse scope, and
   * PENDING_APPROVAL — a Super Admin must activate (and assign scope) before
   * the account can log in. Role/scope are never taken from the client.
   */
  registerSelfSignup(dto: RegisterDto): Promise<SafeUser> {
    return this.createWithPassword({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: Role.STAFF,
      status: UserStatus.PENDING_APPROVAL,
    });
  }

  private async createWithPassword(input: {
    name: string;
    email: string;
    password: string;
    role?: Role;
    status?: UserStatus;
  }): Promise<SafeUser> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          status: input.status,
        },
        select: userSafeSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({ select: userSafeSelect });
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSafeSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: userSafeSelect,
    });
  }

  async deactivate(id: string): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      // Revoke the refresh token too, so deactivation takes effect immediately
      // (not just at access-token TTL).
      data: { status: UserStatus.INACTIVE, hashedRefreshToken: null },
      select: userSafeSelect,
    });
  }

  /** Approve/reactivate a user (PENDING_APPROVAL or INACTIVE → ACTIVE). */
  async activate(id: string): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
      select: userSafeSelect,
    });
  }

  async setWarehouses(id: string, warehouseIds: string[]): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { warehouses: { set: warehouseIds.map((wid) => ({ id: wid })) } },
      select: userSafeSelect,
    });
  }

  async getWarehouseScope(id: string): Promise<string[]> {
    const rows = await this.prisma.warehouse.findMany({
      where: { users: { some: { id } } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private async ensureExists(id: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('User not found');
  }
}
