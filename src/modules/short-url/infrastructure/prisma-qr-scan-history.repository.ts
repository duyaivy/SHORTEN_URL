import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/services/prisma.service';
import { QrScanHistory } from '../domain/entities/qr-scan-history.entity';
import {
  PaginationParams,
  QrScanHistoryRepository,
} from '../domain/repositories/qr-scan-history.repository';

@Injectable()
export class PrismaQrScanHistoryRepository implements QrScanHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: { owner_id: string; decoded: string }): Promise<QrScanHistory> {
    const record = await this.prisma.qrScanHistory.upsert({
      where: {
        // MongoDB compound unique — use owner_id + decoded as composite key
        // Since Prisma doesn't support composite unique on MongoDB easily,
        // we use findFirst + create/update pattern
        id: '__placeholder__', // Will not match; see below
      },
      create: data,
      update: data,
    }).catch(async () => {
      // Fallback: manual find + create/update
      const existing = await this.prisma.qrScanHistory.findFirst({
        where: { owner_id: data.owner_id, decoded: data.decoded },
      });
      if (existing) {
        const updated = await this.prisma.qrScanHistory.update({
          where: { id: existing.id },
          data: { decoded: data.decoded },
        });
        return updated;
      }
      const created = await this.prisma.qrScanHistory.create({ data });
      return created;
    });

    return new QrScanHistory(
      record.id,
      record.owner_id,
      record.decoded,
      record.created_at,
    );
  }

  async findByOwner(
    owner_id: string,
    params: PaginationParams,
  ): Promise<QrScanHistory[]> {
    const skip = (params.page - 1) * params.limit;
    const records = await this.prisma.qrScanHistory.findMany({
      where: { owner_id },
      skip,
      take: params.limit,
      orderBy: { created_at: 'desc' },
    });
    return records.map(
      (r) => new QrScanHistory(r.id, r.owner_id, r.decoded, r.created_at),
    );
  }

  async countByOwner(owner_id: string): Promise<number> {
    return this.prisma.qrScanHistory.count({ where: { owner_id } });
  }

  async deleteByIdsAndOwner(
    ids: string[],
    owner_id: string,
  ): Promise<void> {
    await this.prisma.qrScanHistory.deleteMany({
      where: {
        id: { in: ids },
        owner_id,
      },
    });
  }
}
