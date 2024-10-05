import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/User';

export class CoreOutputDTO {
  @ApiProperty({ type: Number })
  id?: number;
  @ApiProperty({ type: Date })
  createdAt?: Date;
  @ApiProperty({ type: User })
  createdBy?: User;
  @ApiProperty({ type: Date })
  deletedAt?: Date;
  @ApiProperty({ type: User })
  deletedBy?: User;
  @ApiProperty({ type: Date })
  updatedAt?: Date;
  @ApiProperty({ type: User })
  updatedBy?: User;
}
