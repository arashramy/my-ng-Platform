import { BadRequestException, Controller } from '@nestjs/common';
import { PermissionKey } from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { SaleUnit } from '../entities/SaleUnit';
import { SaleUnitService } from '../service/sale-unit.service';
import {  User } from '../entities/User';
import { Event } from '../../automation/base/entities/Event';
import { Locker } from '../../automation/base/entities/Locker';
import { Loan } from '../../automation/base/entities/Loan';
import { SubProduct } from '../../automation/base/entities/SubProduct';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import { SaleOrder } from '../../automation/operational/entities/SaleOrder';
import { Transaction } from '../../automation/operational/entities/Transaction';
import { UserLoan } from '../../automation/operational/entities/UserLoan';
import { Bank } from '../entities/Bank';
import { AttendanceDevice } from '../entities/AttendanceDevice';
import { CashDesk } from '../entities/CashDesk';
import { Location } from '../entities/Location';

@Controller('/api/sale-unit')
export class SaleUnitController extends BaseController<SaleUnit> {
  constructor(private saleUnitService: SaleUnitService) {
    super(SaleUnit, PermissionKey.BASE_SALE_UNIT);
  }

  queryPaging(): 'take' | 'offset' {
    return 'offset';
  }

  additionalPermissions(): any[] {
    return [];
  }

  async prepareDelete(id: number, current: User): Promise<void> {
    const event = await Event.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (event) {
      throw new BadRequestException(
        'this saleUnit has event,please first delete that'
      );
    }

    const locker = await Locker.findOne({
      where:{},
      //  { saleUnit: { id } }, //! remove saleunit from location
      relations: ['saleUnit']
    });

    if (locker) {
      throw new BadRequestException(
        'this saleUnit has locker,please first delete that'
      );
    }

    const loan = await Loan.findOne({
      where: { saleUnits: { id } },
      relations: ['saleUnits']
    });

    if (loan) {
      throw new BadRequestException(
        'this saleUnit has loan,please first delete that'
      );
    }

    const subProduct = await SubProduct.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (subProduct) {
      throw new BadRequestException(
        'this saleUnit has subProduct,please first delete that'
      );
    }

    const saleItem = await SaleItem.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (saleItem) {
      throw new BadRequestException(
        'this saleUnit has saleItem,please first delete that'
      );
    }

    const saleOrder = await SaleOrder.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (saleOrder) {
      throw new BadRequestException(
        'this saleUnit has saleOrder,please first delete that'
      );
    }

    const transaction = await Transaction.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (transaction) {
      throw new BadRequestException(
        'this saleUnit has Transaction,please first delete that'
      );
    }

    const userLoan = await UserLoan.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (userLoan) {
      throw new BadRequestException(
        'this saleUnit has userLoan,please first delete that'
      );
    }

    const bank = await Bank.findOne({
      where: { saleUnits: { id } },
      relations: ['saleUnits']
    });

    if (bank) {
      throw new BadRequestException(
        'this saleUnit has bank,please first delete that'
      );
    }

    const attendanceDevice = await AttendanceDevice.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (attendanceDevice) {
      throw new BadRequestException(
        'this saleUnit has attendanceDevice,please first delete that'
      );
    }

    const cashDesk = await CashDesk.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (cashDesk) {
      throw new BadRequestException(
        'this saleUnit has cashDesk,please first delete that'
      );
    }

    const location = await Location.findOne({
      where: { saleUnit: { id } },
      relations: ['saleUnit']
    });

    if (location) {
      throw new BadRequestException(
        'this saleUnit has location,please first delete that'
      );
    }

    return;
  }
}
