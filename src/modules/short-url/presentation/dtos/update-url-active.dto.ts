import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UrlActiveItem {
  @ApiProperty({
    description: 'ID of the URL to update',
    example: 'abc123',
  })
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'Active status',
    example: true,
  })
  @IsBoolean({ message: 'is_active phải là boolean' })
  is_active: boolean;
}

export class UpdateUrlActiveDTO {
  @ApiProperty({
    description: 'List of URLs to update active status',
    type: [UrlActiveItem],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UrlActiveItem)
  urls: UrlActiveItem[];
}
