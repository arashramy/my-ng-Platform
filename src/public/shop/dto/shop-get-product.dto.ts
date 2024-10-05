import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../../automation/base/entities/Product';

export class ShopGetProductResponseDTO {
  @ApiProperty({ type: () => [Product] })
  data: [Product];

  @ApiProperty()
  totalAmount: number;
}
