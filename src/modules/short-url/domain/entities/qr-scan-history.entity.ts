export class QrScanHistory {
  constructor(
    public readonly id: string,
    public readonly owner_id: string,
    public readonly decoded: string,
    public readonly created_at: Date,
  ) { }
}
