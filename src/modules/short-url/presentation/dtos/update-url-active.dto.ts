import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UrlActiveItem {
  @IsString()
  _id: string;

  @IsBoolean({ message: 'is_active phải là boolean' })
  is_active: boolean;
}

export class UpdateUrlActiveDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UrlActiveItem)
  urls: UrlActiveItem[];
}
