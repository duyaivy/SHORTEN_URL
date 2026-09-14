import { QrScanHistory } from '../entities/qr-scan-history.entity';
import { PaginationParams, PaginationResult } from './short-url.repository';

export type { PaginationParams, PaginationResult };

export abstract class QrScanHistoryRepository {
  abstract upsert(data: {
    owner_id: string;
    decoded: string;
  }): Promise<QrScanHistory>;

  abstract findByOwner(
    owner_id: string,
    params: PaginationParams,
  ): Promise<QrScanHistory[]>;

  abstract countByOwner(owner_id: string): Promise<number>;

  abstract deleteByIdsAndOwner(ids: string[], owner_id: string): Promise<void>;
}
