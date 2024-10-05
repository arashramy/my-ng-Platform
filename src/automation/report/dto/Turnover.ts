import { Export } from '../../../common/decorators/export.decorator';

@Export<Turnover>({
  name: 'Turnover',
  translateKey: 'AUTOMATION_REPORT_TURNOVER',
  columns: {}
})
export class Turnover {
  title: string;
  count: number;
  amount: number;
  quantity: number;
  type: number;
  saleUnitId: number;
  sourceType: number;
  source: number;
  sourceTitle: string;
}
