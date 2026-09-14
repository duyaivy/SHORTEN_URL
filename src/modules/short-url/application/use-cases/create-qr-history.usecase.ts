import { Injectable } from '@nestjs/common';
import { QrScanHistoryRepository } from '../../domain/repositories/qr-scan-history.repository';

@Injectable()
export class CreateQrHistoryUseCase {
  constructor(
    private readonly qrScanHistoryRepository: QrScanHistoryRepository,
  ) {}

  async execute(decoded: string, userId: string) {
    return this.qrScanHistoryRepository.upsert({
      owner_id: userId,
      decoded,
    });
  }
}
