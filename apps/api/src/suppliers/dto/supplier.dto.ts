import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierStatus } from '@prisma/client';

export class SupplierDto {
  @ApiProperty({ description: 'Supplier id (UUID).' })
  id!: string;

  @ApiProperty({ description: 'Supplier name.', example: 'Acme Beverages Ltd' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  contactName!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty({
    description: 'Supplier status.',
    enum: SupplierStatus,
    enumName: 'SupplierStatus',
    example: SupplierStatus.ACTIVE,
  })
  status!: SupplierStatus;

  @ApiProperty({ description: 'Creation timestamp.' })
  createdAt!: Date;
}
