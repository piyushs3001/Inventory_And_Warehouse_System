import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AssignWarehousesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  warehouseIds!: string[];
}
