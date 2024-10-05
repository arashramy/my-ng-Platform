import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { User } from '../../../base/entities/User';
import { Export } from '../../../common/decorators/export.decorator';

// id,user,service,type,submitAt,quantity,mainServicePriceAmount,discount,contractorIncome,contractorIncomeAfterDiscount,contractorIncome,contractorIncomeAfterDiscount
@Export<ContractorReport>({
  name: 'ContractorReport',
  translateKey: 'AUTOMATION_REPORT_CONTRACTOR',
  defaultSelect: ['Income', 'IncomeAfterDiscount'],
  columns: {
    user: {
      transform(obj) {
        if (obj?.firstName && obj?.lastName && obj?.code)
          return `${obj.firstName} ${obj?.lastName} - ${obj?.code}`;
        if (obj.user)
          return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
      }
    },
    contractor: {
      transform(obj) {
        return `${obj.firstName} ${obj?.lastName} - ${obj?.code}`;
      }
    },
    saleItem: {
      transform(obj) {
        return obj?.title;
      }
    },
    service: {
      transform(obj) {
        return obj?.saleItem?.title;
      }
    },
    submitAt: {
      transform(obj) {
        return obj?.saleItem?.submitAt;
      },
      type: 'datetime'
    },
    quantity: {
      transform(obj) {
        return obj?.saleItem?.quantity;
      }
    },
    mainServicePriceAmount: {
      transform(obj) {
        return obj?.saleItem?.totalAmount;
      }
    },
    discount: {
      transform(obj) {
        return obj?.discount || 0;
      }
    }
  }
})
export class ContractorReport {
  contractorIncomeAfterDiscount: number;
  contractorIncome: number;
  qty: number;
  discount: number;
  title: string;
  user: User;
  saleItem: SaleItem;
  totalAmount: number;
  firstName: string;
  lastName: string;
  code: number;
}
