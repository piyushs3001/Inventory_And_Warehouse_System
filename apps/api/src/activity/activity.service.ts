import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  warehouseId?: string | null;
  summary: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append one ActivityLog row. Pass a transaction client `tx` to commit it
   * atomically with the action it records (e.g. alongside a StockMovement);
   * omit it for standalone, post-action logging.
   */
  async record(input: ActivityInput, tx?: Db): Promise<void> {
    const db = tx ?? this.prisma;
    await db.activityLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        warehouseId: input.warehouseId ?? null,
        summary: input.summary,
        before: input.before,
        after: input.after,
      },
    });
  }

  async list(opts: {
    userId?: string;
    entityType?: string;
    action?: string;
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  }) {
    const createdAt =
      opts.from || opts.to
        ? {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          }
        : undefined;
    const where: Prisma.ActivityLogWhereInput = {
      ...(opts.userId ? { userId: opts.userId } : {}),
      ...(opts.entityType ? { entityType: opts.entityType } : {}),
      ...(opts.action ? { action: opts.action } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.name ?? null,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        warehouseId: r.warehouseId,
        summary: r.summary,
        createdAt: r.createdAt,
      })),
      total,
      page: opts.page,
      pageSize: opts.pageSize,
    };
  }
}
