import { IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from '@prisma/client';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  public page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  public limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `status must be a valid enum value: ${OrderStatusList}`,
  })
  status?: OrderStatus;
}
