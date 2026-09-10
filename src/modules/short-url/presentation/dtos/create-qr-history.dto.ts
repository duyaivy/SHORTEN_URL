import { IsUrl } from 'class-validator';

export class CreateQrHistoryDTO {
  @IsUrl({ require_tld: false }, { message: 'decoded phải là URL hợp lệ' })
  decoded: string;
}
