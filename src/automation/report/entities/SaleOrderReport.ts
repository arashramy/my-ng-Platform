import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: '_sale_order_report' })
export class SaleOrderReport extends BaseEntity {
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;
  @Column('date', { name: 'date' })
  date?: string;
  @Column({ name: 'month_g' })
  monthGeorg?: number;
  @Column({ name: 'month_j' })
  monthJalali?: number;
  @Column({ name: 'years_g', default: 0 })
  yearGeorg?: number;
  @Column({ name: 'years_j', default: 0 })
  yearJalali?: number;
  @Column({ name: 'season' })
  season?: number;
  @Column({ name: 'day_of_week' })
  dayOfWeek?: number;
  @Column({ name: 'user' })
  user?: number;
  @Column({ name: 'quantity', default: 0 })
  quantity?: number;
  @Column({ name: 'sale_unit' })
  saleUnit?: number;
  @Column({ name: 'category' })
  category?: number;
  @Column({ name: 'sale_order' })
  saleOrder?: number;
  @Column({ name: 'product' })
  product?: number;
  @Column({ name: 'type' })
  type?: number;
  @Column({ name: 'org_unit' })
  orgUnit?: number;
  @Column({ name: 'shift_work' })
  shiftWork?: number;
  @Column({ name: 'fiscal_year' })
  fiscalYear?: number;
  @Column({ name: 'h_0', default: 0 })
  h0?: number;
  @Column({ name: 'h_1', default: 0 })
  h1?: number;
  @Column({ name: 'h_2', default: 0 })
  h2?: number;
  @Column({ name: 'h_3', default: 0 })
  h3?: number;
  @Column({ name: 'h_4', default: 0 })
  h4?: number;
  @Column({ name: 'h_5', default: 0 })
  h5?: number;
  @Column({ name: 'h_6', default: 0 })
  h6?: number;
  @Column({ name: 'h_7', default: 0 })
  h7?: number;
  @Column({ name: 'h_8', default: 0 })
  h8?: number;
  @Column({ name: 'h_9', default: 0 })
  h9?: number;
  @Column({ name: 'h_10', default: 0 })
  h10?: number;
  @Column({ name: 'h_11', default: 0 })
  h11?: number;
  @Column({ name: 'h_12', default: 0 })
  h12?: number;
  @Column({ name: 'h_13', default: 0 })
  h13?: number;
  @Column({ name: 'h_14', default: 0 })
  h14?: number;
  @Column({ name: 'h_15', default: 0 })
  h15?: number;
  @Column({ name: 'h_16', default: 0 })
  h16?: number;
  @Column({ name: 'h_17', default: 0 })
  h17?: number;
  @Column({ name: 'h_18', default: 0 })
  h18?: number;
  @Column({ name: 'h_19', default: 0 })
  h19?: number;
  @Column({ name: 'h_20', default: 0 })
  h20?: number;
  @Column({ name: 'h_21', default: 0 })
  h21?: number;
  @Column({ name: 'h_22', default: 0 })
  h22?: number;
  @Column({ name: 'h_23', default: 0 })
  h23?: number;
}
