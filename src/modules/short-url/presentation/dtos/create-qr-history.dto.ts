import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQrHistoryDTO {
  @ApiProperty({
    description: 'URL decoded from the QR code',
    example: 'https://short.url/my-link',
  })
  @IsUrl({ require_tld: false }, { message: 'decoded phải là URL hợp lệ' })
  decoded: string;
}
