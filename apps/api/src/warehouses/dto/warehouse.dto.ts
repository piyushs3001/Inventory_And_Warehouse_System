import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseStatus } from '@prisma/client';

export class WarehouseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  contactPerson!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  capacity!: number | null;

  @ApiProperty({ enum: WarehouseStatus, enumName: 'WarehouseStatus' })
  status!: WarehouseStatus;

  @ApiProperty()
  createdAt!: Date;
}
