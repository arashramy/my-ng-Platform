import { GlobalFilter, Relation } from '../../../common/decorators/mvc.decorator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Column, Entity, JoinColumn, Like, ManyToOne } from 'typeorm';

@Relation({
  findAll: ['saleUnit'],
  get: ['saleUnit']
})
@Entity({ name: '_task' })
export class Task extends CoreEntity {
  @Column({ name: 'title' })
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  title: string;
  @ManyToOne(() => SaleUnit, (object) => object.id)
  @JoinColumn({ name: 'sale_unit', referencedColumnName: 'id' })
  saleUnit?: SaleUnit;
  @Column({ name: 'has_cost', default: false })
  hasCost?: boolean;
  @Column({ name: 'has_durations', default: false })
  hasDuration?: boolean;
  @Column({ name: 'has_wasting_time', default: false })
  hasWaistingTime?: boolean;
  @Column({ name: 'has_call_count', default: false })
  hasCallCount?: boolean;
}
