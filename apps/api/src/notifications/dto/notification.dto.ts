import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'LOW_STOCK' }) type!: string;
  @ApiProperty({ example: 'Low stock: Cola 330ml Can' }) title!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) body!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) link!: string | null;
  @ApiProperty({ example: false }) read!: boolean;
  @ApiProperty() createdAt!: Date;
}
