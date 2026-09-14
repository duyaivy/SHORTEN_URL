import { Injectable } from '@nestjs/common';
import { QrScanHistoryRepository } from '../../domain/repositories/qr-scan-history.repository';

@Injectable()
export class DeleteQrHistoriesUseCase {
  constructor(
    private readonly qrScanHistoryRepository: QrScanHistoryRepository,
  ) {}

  async execute(ids: string[], userId: string): Promise<void> {
    await this.qrScanHistoryRepository.deleteByIdsAndOwner(ids, userId);
  }
}
