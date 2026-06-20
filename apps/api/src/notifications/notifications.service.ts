import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDto } from './dto/notification.dto';

type Db = PrismaService | Prisma.TransactionClient;

export interface NotificationInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fan a notification out to every active user who oversees a warehouse:
   * all Super Admins plus the Warehouse Managers assigned to it. Used for
   * low-stock and PO-approval alerts. Accepts a tx client so it can ride along
   * with the action that triggered it.
   */
  async notifyWarehouseOverseers(
    warehouseId: string,
    input: NotificationInput,
    tx?: Db,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const recipients = await db.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        OR: [
          { role: Role.SUPER_ADMIN },
          {
            role: Role.WAREHOUSE_MANAGER,
            warehouses: { some: { id: warehouseId } },
          },
        ],
      },
      select: { id: true },
    });
    if (recipients.length === 0) return;
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      })),
    });
  }

  private toDto(n: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read: boolean;
    createdAt: Date;
  }): NotificationDto {
    return n;
  }

  async listForUser(
    userId: string,
    unreadOnly = false,
  ): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    });
    return rows.map((r) => this.toDto(r));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string): Promise<NotificationDto> {
    // Scope to the owner so a caller can only mark their own notifications.
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (result.count === 0)
      throw new NotFoundException('Notification not found');
    const updated = await this.prisma.notification.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
      },
    });
    return this.toDto(updated);
  }
}
