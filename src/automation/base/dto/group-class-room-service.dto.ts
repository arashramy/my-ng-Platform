import { Expose } from 'class-transformer';

export class GroupClassRoomService {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  price: number;
}
