import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteIdsDTO {
  @ApiProperty({
    description: 'List of IDs to delete',
    type: [String],
    example: ['id1', 'id2', 'id3'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
