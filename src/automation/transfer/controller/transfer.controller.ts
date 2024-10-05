import {TransferRegisterService} from '../dtos/transfer-register-service.dto';
import {BadRequestException, Body, Controller, Post, UseGuards,} from '@nestjs/common';
import {TransferWalletDTO} from '../dtos/transfer-wallet.dto';
import {AccessTokenGuard} from '../../../auth/guard/access-token.guard';
import {CurrentUser} from '../../../auth/decorators/current-user.decorator';
import {User} from '../../../base/entities/User';
import {Transaction, TransactionType} from '../../operational/entities/Transaction';
import moment from 'moment';
import {AppConstant} from '../../../common/constant/app.constant';
import {common_permissions} from '../../../common/controller/base.controller';
import {PermissionKey} from '../../../common/constant/auth.constant';
import {Permissions} from '../../../auth/decorators/permissions.decorator';

@UseGuards(AccessTokenGuard)
@Controller('api/transfer')
export class TransferController {
  @Permissions([...common_permissions, PermissionKey.TRANSFER_WALLET])
  @Post('wallet')
  async transferWallet(
      @Body() transferBody: TransferWalletDTO,
      @CurrentUser() user: User,
  ) {
    if (transferBody.credit === 0) {
      throw new BadRequestException('Invalid Credit');
    }

    const userEntity = await User.findOne({ where: { id: transferBody.user } });
    if (!userEntity) {
      throw new BadRequestException('User Not Found');
    }
    const transactionExist = await Transaction.findOne({
      where: {
        user: {
          id: userEntity.id,
        },
      },
    });
    if (transactionExist) {
      throw new BadRequestException('Exist Before');
    }
    const transaction = new Transaction();
    transaction.submitAt = moment(
      transferBody.submitedAt,
      AppConstant.SUBMIT_TIME_FORMAT,
    ).toDate();
    transaction.user = userEntity;
    transaction.createdBy = user;
    // transaction.type = TransactionType.TRANSFER;
    transaction.amount = transferBody.credit;
    await User.update(
      { id: userEntity.id },
      { credit: transaction.amount + userEntity.credit },
    );
    return transaction.save();
  }

  @Permissions([
    ...common_permissions,
    PermissionKey.TRANSFER_REGISTERED_SERVICE,
  ])
  @Post('register-service')
  async transferRegisterService(
    @Body() transferBody: TransferRegisterService,
    @CurrentUser() currentUser: User,
  ) {
    // if (moment(transferBody.end).isBefore(transferBody.start)) {
    //   throw new BadRequestException('Invalid EndTime');
    // }
    // if (
    //   !moment(transferBody.submitedAt).isValid() ||
    //   moment(transferBody.submitedAt).isAfter(moment())
    // ) {
    //   throw new BadRequestException('Invalid Submited At');
    // }
    // const user = await User.findOne({ where: { id: transferBody.user } });
    // if (!user) {
    //   throw new BadRequestException('User Not Found');
    // }
    // const service = await Service.findOne({
    //   where: { id: transferBody.service },
    // });
    // if (!service) {
    //   throw new BadRequestException('Service Not Found');
    // }
    // const registeredService = new RegisteredService();
    // if (service.hasContractor && transferBody.contractor) {
    //   const contractor = await User.findOne({
    //     where: { id: transferBody.contractor },
    //   });
    //   if (!contractor) {
    //     throw new BadRequestException('Contractor Not Found');
    //   }
    //   registeredService.contractor = contractor;
    // }
    // if (registeredService.contractor) {
    //   const serviceContractor = await ServiceContractor.findOne({
    //     where: {
    //       contractor: { id: registeredService.contractor.id },
    //       service: { id: registeredService.service.id },
    //     },
    //     cache: true,
    //   });
    //   if (!serviceContractor) {
    //     throw new BadRequestException('Contractor not found');
    //   }
    //   if (serviceContractor) {
    //     registeredService.contractorIncome = serviceContractor.calculateIncome(
    //       registeredService.totalServiceAmount,
    //     );
    //     registeredService.contractorIncomeAfterDiscount =
    //       serviceContractor.calculateIncome(transferBody.credit);
    //   }
    // }
    // registeredService.credit = transferBody.credit;
    // registeredService.service = service;
    // registeredService.user = user;
    // registeredService.submitAt = moment(
    //   transferBody.submitedAt,
    //   AppConstant.SUBMIT_TIME_FORMAT,
    // ).toDate();
    // registeredService.start = moment(
    //   transferBody.start,
    //   AppConstant.DATE_FORMAT,
    // ).toDate();
    // registeredService.end = moment(
    //   transferBody.end,
    //   AppConstant.DATE_FORMAT,
    // ).toDate();
    //
    // registeredService.status = RegisteredServiceStatus.opened;
    // registeredService.createdBy = currentUser;
    // return registeredService.save();
  }
}
