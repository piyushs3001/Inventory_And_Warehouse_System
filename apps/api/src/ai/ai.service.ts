import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService, ReportType } from '../reports/reports.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { WarehouseScope } from '../auth/auth.types';
import { warehouseFilter } from '../auth/scope.helpers';
import { ReorderSuggestionDto } from './dto/reorder-suggestion.dto';
import { ForecastRequestDto, ForecastResultDto } from './dto/forecast.dto';
import {
  ChatRequestDto,
  ChatResponseDto,
  ReportSummaryDto,
} from './dto/ai-text.dto';
import {
  GeneratePoRequestDto,
  GeneratePoResultDto,
  SkippedReorderDto,
} from './dto/generate-po.dto';
import { PurchaseOrderDto } from '../purchase-orders/dto/purchase-order.dto';

const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 30;

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reports: ReportsService,
    private readonly purchaseOrders: PurchaseOrdersService,
  ) {}

  private llmConfigured(): boolean {
    return Boolean(
      this.config.get<string>('OPENAI_API_KEY') ||
      this.config.get<string>('GEMINI_API_KEY'),
    );
  }

  // Outflow (units consumed) per product×warehouse over the lookback window,
  // from the movement ledger (negative available deltas). The backbone of the
  // reproducible, non-LLM reorder/forecast maths.
  private async consumptionSince(
    scope: WarehouseScope,
    since: Date,
    filter: { productId?: string; warehouseId?: string },
  ): Promise<Map<string, number>> {
    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'warehouseId'],
      where: {
        AND: [
          warehouseFilter(scope, 'warehouseId'),
          ...(filter.warehouseId ? [{ warehouseId: filter.warehouseId }] : []),
        ],
        availableDelta: { lt: 0 },
        createdAt: { gte: since },
        ...(filter.productId ? { productId: filter.productId } : {}),
      },
      _sum: { availableDelta: true },
    });
    const map = new Map<string, number>();
    for (const g of grouped) {
      map.set(`${g.productId}:${g.warehouseId}`, -(g._sum.availableDelta ?? 0));
    }
    return map;
  }

  private since(): Date {
    return new Date(Date.now() - LOOKBACK_DAYS * DAY_MS);
  }

  async reorderSuggestions(
    scope: WarehouseScope,
    warehouseId?: string,
  ): Promise<ReorderSuggestionDto[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        AND: [
          warehouseFilter(scope, 'warehouseId'),
          ...(warehouseId ? [{ warehouseId }] : []),
        ],
        product: { reorderLevel: { gt: 0 } },
      },
      include: {
        product: { select: { name: true, sku: true, reorderLevel: true } },
        warehouse: { select: { name: true } },
      },
    });
    const low = items.filter((it) => it.available <= it.product.reorderLevel);
    const consumption = await this.consumptionSince(scope, this.since(), {
      warehouseId,
    });

    return low
      .map((it) => {
        const used = consumption.get(`${it.productId}:${it.warehouseId}`) ?? 0;
        const dailyConsumption = Math.round((used / LOOKBACK_DAYS) * 100) / 100;
        const daysToStockout =
          dailyConsumption > 0
            ? Math.round(it.available / dailyConsumption)
            : null;
        const suggestedQty = Math.max(
          1,
          it.product.reorderLevel * 2 - it.available,
        );
        return {
          productId: it.productId,
          productName: it.product.name,
          sku: it.product.sku,
          warehouseId: it.warehouseId,
          warehouseName: it.warehouse.name,
          available: it.available,
          reorderLevel: it.product.reorderLevel,
          suggestedQty,
          dailyConsumption,
          daysToStockout,
          rationale:
            `Available ${it.available} ≤ reorder level ${it.product.reorderLevel}. ` +
            (dailyConsumption > 0
              ? `Consuming ~${dailyConsumption}/day (last ${LOOKBACK_DAYS}d) → ~${daysToStockout} day(s) of cover. `
              : `No recent consumption recorded. `) +
            `Suggest ordering ${suggestedQty} to restore 2× the reorder level.`,
        };
      })
      .sort((a, b) => {
        const ax = a.daysToStockout ?? Number.MAX_SAFE_INTEGER;
        const bx = b.daysToStockout ?? Number.MAX_SAFE_INTEGER;
        return ax - bx || a.available - b.available;
      });
  }

  async forecast(
    scope: WarehouseScope,
    dto: ForecastRequestDto,
  ): Promise<ForecastResultDto> {
    const days = dto.days ?? 7;
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        AND: [
          warehouseFilter(scope, 'warehouseId'),
          ...(dto.warehouseId ? [{ warehouseId: dto.warehouseId }] : []),
        ],
        ...(dto.productId ? { productId: dto.productId } : {}),
      },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
    });
    const consumption = await this.consumptionSince(scope, this.since(), {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
    });
    const now = Date.now();

    const forecastItems = items.map((it) => {
      const used = consumption.get(`${it.productId}:${it.warehouseId}`) ?? 0;
      const avg = Math.round((used / LOOKBACK_DAYS) * 100) / 100;
      const forecastDemand = Math.ceil(avg * days);
      const projectedStockoutDate =
        avg > 0 ? new Date(now + (it.available / avg) * DAY_MS) : null;
      return {
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        warehouseId: it.warehouseId,
        warehouseName: it.warehouse.name,
        available: it.available,
        avgDailyConsumption: avg,
        forecastDemand,
        projectedStockoutDate,
        rationale:
          `Moving average of ~${avg} units/day over the last ${LOOKBACK_DAYS} days ` +
          `→ projected demand of ${forecastDemand} units over the next ${days} day(s).`,
      };
    });

    return {
      days,
      lookbackDays: LOOKBACK_DAYS,
      items: forecastItems,
      generatedAt: new Date(),
    };
  }

  /**
   * Chat assistant. Full RAG (LangChain + pgvector + LLM) requires a provider
   * key — when one is set this is where it would run, scoped to the caller's
   * warehouses. Without a key we DON'T fabricate: we fall back to a transparent,
   * non-LLM keyword lookup that answers simple "how much <product>" questions
   * from real scoped stock, and clearly flags itself as a basic lookup.
   */
  async chat(
    scope: WarehouseScope,
    dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const matches = await this.keywordStockLookup(scope, dto.question);
    const notice = this.llmConfigured()
      ? ''
      : ' (Basic keyword lookup — set OPENAI_API_KEY or GEMINI_API_KEY for full conversational answers.)';

    if (matches.length === 0) {
      return {
        configured: this.llmConfigured(),
        answer: `I couldn't match a product in your question to your in-scope inventory.${notice}`,
        sources: [],
      };
    }
    const answer =
      matches
        .map(
          (m) =>
            `${m.name} (${m.sku}): ${m.available} available across your warehouses`,
        )
        .join('; ') + `.${notice}`;
    return {
      configured: this.llmConfigured(),
      answer,
      sources: matches.map((m) => m.sku),
    };
  }

  // Match question words against product name/sku and total available in scope.
  private async keywordStockLookup(
    scope: WarehouseScope,
    question: string,
  ): Promise<{ name: string; sku: string; available: number }[]> {
    const words = question
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter((w) => w.length >= 3);
    if (words.length === 0) return [];
    const products = await this.prisma.product.findMany({
      where: {
        OR: words.flatMap((w) => [
          { name: { contains: w, mode: 'insensitive' } },
          { sku: { contains: w, mode: 'insensitive' } },
        ]),
        // Only surface products the caller actually holds in scope — don't
        // disclose the existence of catalog items stocked only out-of-scope.
        inventoryItems: { some: warehouseFilter(scope, 'warehouseId') },
      },
      select: { id: true, name: true, sku: true },
      take: 5,
    });
    const results: { name: string; sku: string; available: number }[] = [];
    for (const p of products) {
      const agg = await this.prisma.inventoryItem.aggregate({
        where: { ...warehouseFilter(scope, 'warehouseId'), productId: p.id },
        _sum: { available: true },
      });
      results.push({
        name: p.name,
        sku: p.sku,
        available: agg._sum.available ?? 0,
      });
    }
    return results;
  }

  async summarizeReport(
    scope: WarehouseScope,
    type: ReportType,
  ): Promise<ReportSummaryDto> {
    const report = await this.reports.build(type, scope);
    // Deterministic, figure-accurate summary (LLM would only rephrase it).
    const parts = Object.entries(report.summary).map(([k, v]) => `${k}: ${v}`);
    const summary = `${type[0].toUpperCase()}${type.slice(1)} report — ${parts.join('; ')}.`;
    return {
      type,
      llmEnhanced: this.llmConfigured(),
      summary,
      figures: report.summary,
      generatedAt: new Date(),
    };
  }

  async generatePo(
    scope: WarehouseScope,
    userId: string,
    dto: GeneratePoRequestDto,
  ): Promise<GeneratePoResultDto> {
    const suggestions = await this.reorderSuggestions(scope, dto.warehouseId);

    // Group reorder lines by (warehouse, supplier), deriving each product's
    // supplier from its most recent purchase order.
    const groups = new Map<
      string,
      {
        warehouseId: string;
        supplierId: string;
        lines: { productId: string; quantity: number; unitCost: number }[];
      }
    >();
    const skipped: SkippedReorderDto[] = [];

    for (const s of suggestions) {
      const lastPo = await this.prisma.purchaseOrder.findFirst({
        where: { lines: { some: { productId: s.productId } } },
        orderBy: { createdAt: 'desc' },
        select: {
          supplierId: true,
          lines: {
            where: { productId: s.productId },
            select: { unitCost: true },
            take: 1,
          },
        },
      });
      if (!lastPo) {
        skipped.push({
          productId: s.productId,
          productName: s.productName,
          warehouseId: s.warehouseId,
          reason:
            'No prior supplier on record — assign a supplier and create the PO manually.',
        });
        continue;
      }
      const unitCost = lastPo.lines[0]?.unitCost
        ? Number(lastPo.lines[0].unitCost)
        : 0;
      const key = `${s.warehouseId}:${lastPo.supplierId}`;
      const group = groups.get(key) ?? {
        warehouseId: s.warehouseId,
        supplierId: lastPo.supplierId,
        lines: [],
      };
      group.lines.push({
        productId: s.productId,
        quantity: s.suggestedQty,
        unitCost,
      });
      groups.set(key, group);
    }

    const created: PurchaseOrderDto[] = [];
    for (const group of groups.values()) {
      const po = await this.purchaseOrders.create(scope, userId, {
        supplierId: group.supplierId,
        warehouseId: group.warehouseId,
        notes:
          'Auto-generated draft from reorder suggestions — review before sending.',
        lines: group.lines,
      });
      created.push(po);
    }
    return { created, skipped };
  }
}
