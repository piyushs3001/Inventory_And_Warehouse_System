import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser, userSafeSelect } from './users.select';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
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
      data: { status: UserStatus.INACTIVE },
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
