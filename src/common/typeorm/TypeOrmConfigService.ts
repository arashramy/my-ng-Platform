import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { User } from '../../base/entities/User';
import { IntroductionMethod } from '../../base/entities/IntroductionMethod';
import { Setting } from '../../base/entities/Setting';
import { Bank } from '../../base/entities/Bank';
import { CashDesk } from '../../base/entities/CashDesk';
import { Locker } from '../../automation/base/entities/Locker';
import { Transaction } from '../../automation/operational/entities/Transaction';
import { ReceptionLocker } from '../../automation/operational/entities/ReceptionLocker';
import { LockerItem } from '../../automation/operational/entities/LockerItem';
import { ProductCategory } from '../../automation/base/entities/ProductCategory';
import { SaleUnit } from '../../base/entities/SaleUnit';
import { WalletGift } from '../../automation/base/entities/WalletGift';
import { ProductContractor } from '../../automation/base/entities/ProductContractor';
import { ProductSchedule } from '../../automation/base/entities/ProductSchedule';
import { SaleOrder } from '../../automation/operational/entities/SaleOrder';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import { Permission } from '../../base/entities/Permission';
import { WorkGroup } from '../../base/entities/WorkGroup';
import { Dashboard } from '../../base/entities/Dashboard';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { AttendanceDevice } from '../../base/entities/AttendanceDevice';
import { ShiftWork } from '../../base/entities/ShiftWork';
import { ShiftWorkCalendar } from '../../base/entities/ShiftWorkCalendar';
import { Location } from '../../base/entities/Location';
import { GroupClassRoom } from '../../automation/base/entities/GroupClassRoom';
import { GroupClassRoomSchedules } from '../../automation/base/entities/GroupClassRoomSchedules';
import { Product } from '../../automation/base/entities/Product';
import { PresenceOfContractor } from '../../base/entities/PresenceOfContractor';
import { UserLoan } from '../../automation/operational/entities/UserLoan';
import { InstallmentLoan } from '../../automation/operational/entities/InstallmentLoan';
import { ProductPrice } from '../../automation/base/entities/ProductPrice';
import { ShiftWorkSchedule } from '../../base/entities/ShiftWorkSchedule';
import { Comment } from '../../automation/base/entities/Comment';
import { Unit } from '../../base/entities/Unit';
import { SubProduct } from '../../automation/base/entities/SubProduct';
import { DiscountItem } from '../../crm/entities/DiscountItem';
import { ContractorIncome } from '../../automation/operational/entities/ContractorIncome';
import { OfferedDiscount } from '../../crm/entities/OfferedDiscount';
import { SaleOrderReport } from '../../automation/report/entities/SaleOrderReport';
import { Province } from '../../base/entities/Province';
import { City } from '../../base/entities/City';
import { ProductPartner } from '../../automation/base/entities/ProductPartner';
import { UrbanArea } from '../../base/entities/UrbanArea';
import { StandSetting } from '../../automation/base/entities/StandSetting.entity';
import { SignUser } from '../../base/entities/SignUser';
import { ServiceReservationTime } from '../../automation/operational/entities/ServiceReservationTime';
import { Loan } from '../../automation/base/entities/Loan';
import { Cheque } from '../../treasury/entities/Cheque';
import { Ticket } from '../../crm/entities/Ticket';
import { TicketItem } from '../../crm/entities/TicketItem';
import { UserEvent } from '../../crm/entities/UserEvent';
import { Document } from '../../base/entities/Document';
import { UserGroup } from '../../base/entities/UserGroup';
import { UserSmsPanel } from '../../base/entities/UserSmsPanel';
import { PosDevice } from '../../base/entities/PosDevice';
import { SurveyQuestions } from '../../base/entities/SurvayQuestion';
import { EntityAuditLog } from '../../audit-log/entities/EntityAuditLog';
import { ImageHubLog } from '../../image-hub/image-hub-log.entity';
import { AttendanceDeviceLog } from '../../base/entities/AttendanceDeviceLog';
import { UserLevel } from '../../crm/entities/UserLevel';
import { GiftPackage } from '../../crm/entities/GiftPackage';
import { Printer } from '../../base/entities/Printer';
import { Task } from '../../project-management/base/entities/Task';
import { Position } from '../../project-management/base/entities/Position';
import { EngagedUser } from '../../project-management/base/entities/EngagedUser';
import { Project } from '../../project-management/operational/entities/Project';
import { Activity } from '../../project-management/operational/entities/Activity';
import { Backup } from '../../backup/backup.entity';
import { TransferType } from '../../base/entities/TransferType';
import { Gateway } from '../../base/entities/Gateway';
import { SmsTransaction } from '../../sms/sms-transaction/sms-transaction';
import { UserDescription } from '../../base/entities/UserDescription';
import { ProductTag } from '../../automation/base/entities/ProductTag';
import { UserFileAttachment } from '../../automation/operational/entities/UserFileAttachment';
import { ReserveTag } from '../../automation/base/entities/ReserveTag';
import { ReservePattern } from '../../automation/base/entities/ReservePattern';
import { Event } from '../../automation/base/entities/Event';
import { EventSubProduct } from '../../automation/base/entities/EventSubProduct';
import { Payment } from '../../payment/entities/payment.entity';
import { LockerLocation } from '../../automation/base/entities/LockerLocation';

export const TypeOrmOptions = (config: ConfigService) => ({
  type: config.get<any>('DATASOURCE_TYPE'),
  host: config.get<string>('DATASOURCE_HOST'),
  port: config.get<number>('DATASOURCE_PORT'),
  database: config.get<string>('DATASOURCE_DATABASE'),
  username: config.get<string>('DATASOURCE_USER'),
  password: config.get<string>('DATASOURCE_PASSWORD'),
  entities: [
    LockerLocation,
    EventSubProduct,
    Event,
    UserFileAttachment,
    ProductTag,
    UserDescription,
    Printer,
    UserSmsPanel,
    User,
    UserGroup,
    DiscountItem,
    GroupClassRoom,
    GroupClassRoomSchedules,
    IntroductionMethod,
    Setting,
    Permission,
    WorkGroup,
    Bank,
    CashDesk,
    Cheque,
    ProductCategory,
    SubProduct,
    Unit,
    Product,
    Comment,
    SaleUnit,
    SaleItem,
    WalletGift,
    ProductSchedule,
    ProductPrice,
    ProductContractor,
    Locker,
    Payment,
    TransferType,
    Gateway,
    LockerItem,
    SaleOrder,
    ReceptionLocker,
    Dashboard,
    SaleOrderReport,
    Transaction,
    ShiftWorkSchedule,
    FiscalYear,
    Task,
    Position,
    EngagedUser,
    Project,
    Activity,
    OrganizationUnit,
    Location,
    AttendanceDevice,
    ShiftWork,
    ShiftWorkCalendar,
    PresenceOfContractor,
    UserLoan,
    InstallmentLoan,
    ContractorIncome,
    OfferedDiscount,
    Province,
    City,
    UrbanArea,
    ProductPartner,
    StandSetting,
    SignUser,
    ServiceReservationTime,
    Loan,
    Ticket,
    TicketItem,
    UserEvent,
    Document,
    SurveyQuestions,
    PosDevice,
    EntityAuditLog,
    ImageHubLog,
    AttendanceDeviceLog,
    UserLevel,
    GiftPackage,
    Backup,
    SmsTransaction,
    ReserveTag,
    ReservePattern,
  ]
});

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...TypeOrmOptions(this.config),
      subscribers: [],
      migrations: ['src/migrations/*.ts'],
      logging: false,
      // synchronize: true,
      useUTC: true
    };
  }
}
