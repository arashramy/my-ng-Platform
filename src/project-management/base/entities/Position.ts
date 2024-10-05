import { GlobalFilter } from '../../../common/decorators/mvc.decorator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Column, Entity, Like } from 'typeorm';

@Entity({ name: '_position' })
export class Position extends CoreEntity {
  @Column({ name: 'title' })
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  title?: string;
}



