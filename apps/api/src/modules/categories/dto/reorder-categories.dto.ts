import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsInt, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryOrderItem {
  @ApiProperty({ example: 'category-id-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderCategoriesDto {
  @ApiProperty({
    type: [CategoryOrderItem],
    example: [
      { id: 'category-id-1', displayOrder: 0 },
      { id: 'category-id-2', displayOrder: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderItem)
  categories: CategoryOrderItem[];
}
