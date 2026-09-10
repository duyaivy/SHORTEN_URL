import { Injectable } from '@nestjs/common';
import {
  PaginationParams,
  PaginationResult,
} from '../../domain/repositories/short-url.repository';
import { QrScanHistoryRepository } from '../../domain/repositories/qr-scan-history.repository';
import { QrScanHistory } from '../../domain/entities/qr-scan-history.entity';

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

@Injectable()
export class GetMyQrHistoriesUseCase {
  constructor(
    private readonly qrScanHistoryRepository: QrScanHistoryRepository,
  ) {}

  async execute(
    query: { limit?: number; page?: number },
    userId: string,
  ): Promise<PaginationResult<QrScanHistory>> {
    const limit = Number(query.limit) || DEFAULT_LIMIT;
    const page = Number(query.page) || DEFAULT_PAGE;

    const [data, totalDocuments] = await Promise.all([
      this.qrScanHistoryRepository.findByOwner(userId, { limit, page }),
      this.qrScanHistoryRepository.countByOwner(userId),
    ]);

    return {
      control: {
        total: Math.ceil(totalDocuments / limit),
        page,
        limit,
      },
      data,
    };
  }
}
