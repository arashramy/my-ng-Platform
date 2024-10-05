import {
  Column,
  Entity,
  EntityManager,
  Equal,
  IsNull,
  JoinColumn,
  JoinTable,
  Like,
  ManyToMany,
  ManyToOne,
  Not,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IntroductionMethod } from './IntroductionMethod';
import { WorkGroup } from './WorkGroup';


import { IsNotEmpty } from 'class-validator';
import { Export } from '../../common/decorators/export.decorator';
import { FiscalYear } from './FiscalYears';
import { OrganizationUnit } from './OrganizationUnit';
import { SaleUnit } from './SaleUnit';
import { Image } from '../dto/image.dto';
import { PresenceOfContractor } from './PresenceOfContractor';
import { CoreEntity } from './CoreEntity';
import { Bank } from './Bank';
import { UserSmsPanel } from './UserSmsPanel';
import { Import } from '../../common/decorators/import.decorator';
import moment from 'moment-jalaali';
import camelCase from 'lodash/camelCase';
import { HashHelper } from '../../common/helper/hash.helper';
import { Audit } from '../../common/decorators/audit.decorator';
import { AttendanceDeviceLog } from './AttendanceDeviceLog';
import { AttendanceDevice } from './AttendanceDevice';
import { UserLevel } from '../../crm/entities/UserLevel';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import { UserLoan } from '../../automation/operational/entities/UserLoan';
import { Location } from './Location';
import { UserDescription } from './UserDescription';
import { UserFileAttachment } from '../../automation/operational/entities/UserFileAttachment';

export enum Role {
  Admin = 'Admin',
  User = 'User',
  Contactor = 'Contractor',
  Membership = 'Membership'
}

export enum Gender {
  Male,
  Female
}

export enum UserStatus {
  disabled,
  enabled,
  lock
}

@Audit()
@Import<User>({
  columns: {
    mobile: {
      // validator: async (value) => {
      //   return /^0?9[0-9]{9}$/.test(value);
      // },
      transform: async (value) => {
        console.log('value', value);
        value = value?.toString();
        if (value.length === 10) {
          value = '0' + value;
        }
        return value;
      },
      validatorMessage: 'Invalid mobile number',
      priority: 0,
      sample: 'mobile example:0912xxxxxxx'
    },
    code: {
      validator: async (value) => {
        console.log('code', value);
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid code',
      priority: 1,
      sample: 'code character numbers'
    },
    isLegal: {
      transform: async (value) => value === '1' || value === 1,
      priority: 2,
      sample: 'Legal user 1 than 0'
    },
    firstName: { priority: 3 },
    lastName: { priority: 4 },
    nationCode: {
      validator: async (value) => {
        return !value || /^[0-9]{10}$/.test(value);
      },
      transform: async (value) => {
        if (!value) {
          return null;
        }
        value = value?.toString();
        if (value.length < 10) {
          value = value.padStart(10, '0');
        }
        return value;
      },
      validatorMessage: 'Invalid nation code',
      priority: 5,
      sample: 'Nation code 10 digits'
    },
    birthDate: {
      transform: async (value) => {
        let date = moment(value, 'jYYYY-jMM-jDD');
        if (date.isValid()) {
          return date.format('YYYY-MM-DD');
        }
        return null;
      },
      priority: 6,
      sample: 'Birth date is persian date example:1375-01-01'
    },
    gender: {
      transform: async (value) => {
        return +value || 0;
      },
      priority: 7,
      sample: 'Gender for male 1 than 0'
    },
    companyName: { priority: 8 },
    companyEconomicCode: { priority: 9 },
    companyNationCode: { priority: 10 },
    companyType: { priority: 11 },
    companyRegistrationDate: {
      transform: async (value) => {
        let date = moment(value, 'jYYYY-jMM-jDD');
        if (date.isValid()) {
          return date.format('YYYY-MM-DD');
        }
        return null;
      },
      priority: 12,
      sample: 'Company registration date is persian date example:1375-01-01'
    },
    companyRegistrationNumber: {
      validator: async (value) => {
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid registration number',
      priority: 13,
      sample: 'Company registration number is digit'
    },
    email: {
      validator: async (value) => {
        return (
          !value ||
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(
            value
          )
        );
      },
      validatorMessage: 'Invalid email',
      priority: 14
    },
    phone: {
      validator: async (value) => {
        return !value || /^0[0-9]{10}$/.test(value);
      },
      transform: async (value) => {
        if (!value) {
          return null;
        }
        value = value.toString();
        if (value.length === 10) {
          value = '0' + value;
        } else if (value.length === 8) {
          value = '021' + value;
        }
        return value;
      },
      validatorMessage: 'Invalid phone',
      priority: 15,
      sample: 'Phone number example:021xxxxxxx'
    },
    roles: {
      transform: async (value) =>
        value ? [Role[camelCase(value)]] : [Role.Membership],
      priority: 16,
      sample: 'Role items: Admin,User,Membership,Contractor'
    },
    address: { priority: 17 },
    parent: {
      transform: async (value) => {
        if (value && +value) {
          return { id: +value } as User;
        }
        return null;
      },
      priority: 18,
      sample: 'Parent user id'
    }
  },
  validator: async (value: any, em: EntityManager) => {
    let where: any[] = [];
    if (value.code && !Number.isNaN(value.code)) {
      where.push({ code: +value.code });
    }
    if (value.nationCode) {
      where.push({ nationCode: value.nationCode });
    }
    if (where.length === 0) {
      return true;
    }
    return (await em.count(User, { where: where })) == 0;
  },
  validatorMessage: 'exist user by this info code/nation code',
  prepareModel: async (value: any, em: EntityManager) => {
    let user = new User();
    for (let key of Object.keys(value)) {
      if (key == 'password') {
        user.password = await HashHelper.hash(value.password || value.mobile);
      } else {
        user[key] = value[key];
      }
    }
    if (!user.password) {
      user.password = await HashHelper.hash(value.mobile);
    }

    if (user?.mobile) {
      const isExistPhoneNumber = await User.findOne({
        where: { mobile: value.mobile }
      });
      if (isExistPhoneNumber) {
        user.mobile = null;
      }
    }
    user.roles = value.roles?.length ? value.roles : [Role.Membership];
    user.gender = value.gender || Gender.Male;
    user.status = UserStatus.enabled;

    if (!user.code) {
      user.code =
        ((
          await em.findOne(User, {
            where: { code: Not(IsNull()) },
            order: { code: 'DESC' }
          })
        )?.code || 0) + 1;
    }
    return user;
  }
})
@Export<User>({
  name: 'Users',
  translateKey: 'BASE_USERS',
  columns: {
    gender: {
      transform: (obj) => {
        return `${
          obj.roles?.includes(Role.Membership)
            ? 'AUTOMATION_OPT_MEMBERSHIP'
            : 'BASE_USERS'
        }.${Gender[obj.gender || 0]}`;
      }
    },
    status: {
      transform: (obj) =>
        `${
          obj.roles.includes(Role.Membership)
            ? 'AUTOMATION_OPT_MEMBERSHIP'
            : 'BASE_USERS'
        }.${UserStatus[obj.status || 0]}`
    },
    groups: { transform: (obj) => obj.groups?.map((g) => g.title).join(', ') },
    customerGroup: {
      transform(obj) {
        return obj?.customerGroup?.title;
      }
    },
    introductionMethod: { transform: (obj) => obj.introductionMethod?.title },
    authorizedDebtor: {
      transform: (obj) =>
        `${
          obj.roles.includes(Role.Membership)
            ? 'AUTOMATION_OPT_MEMBERSHIP'
            : 'BASE_USERS'
        }.${obj.authorizedDebtor ? 'On' : 'Off'}`
    },
    birthDate: { type: 'date', inputFormat: 'YYYY-MM-DD' },
    roles: {
      type: 'array',
      transform: (obj) =>
        obj.roles?.map(
          (r) =>
            `${
              obj.roles.includes(Role.Membership)
                ? 'AUTOMATION_OPT_MEMBERSHIP'
                : 'BASE_USERS'
            }.${r}`
        )
    },
    profile: {
      type: 'image',
      transform: (obj) => {
        return '';
      }
    },
    credit: { totalsRowFunction: 'sum' },
    accessOrganizationUnits: {
      transform: (obj) =>
        obj.accessOrganizationUnits?.map((ou) => ou?.title).join('\n')
    },
    accessFiscalYears: {
      transform: (obj) =>
        obj.accessFiscalYears?.map((ou) => ou?.year).join(', ')
    }
  }
})
@Relation({
  findAll: [
    'userDescriptions',
    'groups',
    'addresses',
    'parent',
    'userSmsPanel',
    'customerGroup',
    { name: 'userLoans', relations: ['items'] },
    {
      filtersBy: ['product', 'type', 'groupClassRoom', 'submitAt'],
      name: 'saleItems'
    }
  ],
  get: [
    'userDescriptions',
    'groups',
    'addresses',
    'introductionMethod',
    'accessOrganizationUnits',
    'accessFiscalYears',
    'accessShops',
    'accessShops.lockerLocation',
    'accessBanks',
    'schedules',
    'schedules.organizationUnit',
    'parent',
    'userSmsPanel',
    'customerGroup',
    'userLoans'
  ],
  autoComplete: ['userDescriptions'],
  customFilter: {
    roles: (value) => `q.user_roles::jsonb ? '${value}'`,
    hasCredit: (value) => `q.credit > 0`,
    betweenCredit: (value) => {
      const [less, more] = value.split(',');
      let query = '';
      if (+less) {
        query += `q.credit >= ${+less}`;
      }
      if (+more) {
        query += `${query ? ' and' : ''} q.credit <= ${+more}`;
      }
      return query;
    }
  }
})
@Entity({ name: '_users' })
export class User extends CoreEntity {

  @GlobalFilter({
    where: (param: string) => {
      if (Number(param) && param.length < 10) {
        return Equal(param);
      }
    }
  })
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number = null;
  @Column('json', {
    name: 'profile',
    nullable: true
  })
  profile?: Image = null;
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  @Column({ name: 'first_name' })
  firstName?: string = null;
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  @Column({ name: 'last_name', nullable: true })
  lastName?: string = null;
  @IsNotEmpty()
  @GlobalFilter({
    where: (param: string) => {
      if (Number(param) && param.length >= 10) {
        return Equal(param);
      }
    }
  })
  @Column({ name: 'mobile', default: null })
  mobile?: string = null;
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`${param}%`);
      }
    }
  })
  @Column({ name: 'email', nullable: true })
  email?: string = null;
  @Column({ name: 'phone', nullable: true })
  phone?: string = null;
  @Column({ name: 'birth_date', nullable: true })
  birthDate?: string = null;
  @Column({ name: 'nation_code', nullable: true })
  nationCode?: string = null;
  @Column({ name: 'address', nullable: true })
  address?: string = null;
  @Column('json', { name: 'user_roles' })
  roles?: Role[];
  @Column('int', { name: 'status', default: UserStatus.enabled })
  status?: UserStatus;
  @Column({ name: 'insurance_expired_date', nullable: true })
  insuranceExpiredDate?: Date;
  @Column({ name: 'disabled_description', nullable: true })
  disabledDescription?: string = '';
  @ManyToOne(() => IntroductionMethod)
  @JoinColumn({ name: 'introduction_method', referencedColumnName: 'id' })
  introductionMethod?: IntroductionMethod;
  @Column({ name: 'authorized_debtor', default: false })
  authorizedDebtor?: boolean = false;
  @Column('bigint', { name: 'max_dept_amount', default: 0 })
  maxDeptAmount?: number = 0;
  @Column('int', { name: 'gender', default: Gender.Male })
  gender?: Gender = Gender.Male;
  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password' })
  password?: string = null;
  @Column({ name: 'credit', default: 0 })
  credit?: number = 0;
  @Column({ name: 'rate', default: 0 })
  rate?: number = 0;
  @Column({ name: 'is_legal', default: false })
  isLegal?: boolean = false;
  @JoinColumn({ name: 'parent' })
  @ManyToOne(() => User, { nullable: true })
  parent?: User;
  @RelationId((u: User) => u.parent)
  parentId?: number;
  @Exclude()
  @Column({ name: 'reset_token', nullable: true })
  resetToken?: string = null;
  @Exclude()
  @Column('timestamptz', { name: 'reset_date', nullable: true })
  resetTime?: Date = null;
  @Exclude()
  @Column('int', { name: 'reset_number_request', default: 0 })
  resetNumberRequest?: number = 0;
  @Column({ name: 'force_change_password', default: false })
  forceChangePassword?: boolean = false;
  @Column('json', { name: 'config', default: '{}' })
  config?: any;
  @Exclude()
  @Column('text', { name: 'refresh_token', nullable: true })
  refreshToken?: string = null;
  @Column('timestamptz', { name: 'last_logged_in', nullable: true })
  lastLoggedIn?: Date = null;
  @Column({ name: 'face_sample', default: false })
  faceSample?: boolean;
  permissions?: any | string[];

  @Column('bool', { name: 'sms_club', default: true, nullable: true })
  smsClub?: boolean;
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  @Column({ name: 'passport' })
  passport?: string;

  @Column({ name: 'work_address' })
  workAddress?: string;

  @Column({ name: 'en_first_name' })
  enFirstName?: string;

  @Column({ name: 'en_last_name' })
  enLastName?: string;

  @Column({ name: 'fax' })
  fax?: string;

  @Column({ name: 'website' })
  website?: string;

  @Column({ name: 'instagram_id' })
  instagramId?: string;

  @Column({ name: 'company_name', nullable: true })
  companyName?: string;
  @Column({ name: 'company_type', nullable: true })
  companyType?: string;
  @Column({ name: 'company_registration_number', nullable: true })
  companyRegistrationNumber?: string;
  @Column({ name: 'company_registration_date', nullable: true })
  companyRegistrationDate?: string;
  @Column({ name: 'company_nation_code', nullable: true })
  companyNationCode?: string;
  @Column({ name: 'company_economic_code', nullable: true })
  companyEconomicCode?: string;

  @GlobalFilter({
    where: (param: string) => {
      if (param && Number(param) && param.length < 10) {
        return Equal(param);
      }
    }
  })
  @DefaultSort('DESC')
  @Column({ type: 'int', name: 'code', nullable: true, unique: true })
  code: number;

  @Column({ name: 'access_ip_address', nullable: true, unique: true })
  accessIpAddress?: string;

  @Column({ name: 'last_event_id', nullable: true })
  lastEventId?: number;

  @JoinTable({
    name: '_user_workgroup',
    inverseJoinColumn: { name: 'group', referencedColumnName: 'id' },
    joinColumn: { name: 'user', referencedColumnName: 'id' }
  })
  @ManyToMany(() => WorkGroup, {})
  groups?: WorkGroup[];

  @JoinTable({
    name: '_user_fiscal_year',
    joinColumn: { name: 'user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fiscal_year', referencedColumnName: 'id' }
  })
  @ManyToMany(() => FiscalYear, {})
  accessFiscalYears?: FiscalYear[];

  @JoinTable({
    name: '_user_organization_unit',
    joinColumn: { name: 'user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'org_unit', referencedColumnName: 'id' }
  })
  @ManyToMany(() => OrganizationUnit, {})
  accessOrganizationUnits: OrganizationUnit[];

  @OneToMany(() => SaleItem, (s) => s.user)
  saleItems: SaleItem[];

  @ManyToMany(() => SaleUnit, {})
  @JoinTable({
    name: '_sale_unit_user',
    joinColumn: { name: 'user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'sale_unit', referencedColumnName: 'id' }
  })
  accessShops?: SaleUnit[];

  @ManyToMany(() => Bank, {})
  @JoinTable({
    name: '_bank_user',
    joinColumn: { name: 'user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'bank', referencedColumnName: 'id' }
  })
  accessBanks?: Bank[];

  @OneToMany(() => PresenceOfContractor, (object) => object.user, {
    orphanedRowAction: 'soft-delete',
    cascade: true,
    persistence: true
  })
  schedules?: PresenceOfContractor[];

  reception?: number;

  @OneToOne(() => UserSmsPanel, (smsPanel) => smsPanel.user, {
    nullable: false
  })
  userSmsPanel: UserSmsPanel;

  @OneToMany(() => AttendanceDeviceLog, (deviceLog) => deviceLog.user)
  deviceLogs: AttendanceDeviceLog[];

  @OneToMany(() => Location, (location) => location.user, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  addresses?: Location[];

  @ManyToMany(() => AttendanceDevice)
  attendanceDeviceOperated: AttendanceDevice[];

  @Column({
    name: 'face_sample_created_at',
    nullable: true,
    type: 'timestamptz'
  })
  faceSampleCreatedAt: Date;

  @Column({
    name: 'card_sample_created_at',
    nullable: true,
    type: 'timestamptz'
  })
  cardSampleCreatedAt: Date;

  @Column({
    name: 'finger_sample_created_at',
    nullable: true,
    type: 'timestamptz'
  })
  fingerSampleCreatedAt: Date;

  @Column({ name: 'postal_code' })
  postalCode?: string;

  @Column({ name: 'personal_tax_code' })
  personalTaxCode?: string;

  @Column({ name: 'has_activity', default: false })
  hasActivity?: boolean;

  @ManyToOne(() => UserLevel)
  @JoinColumn({ name: 'user_level_user' })
  customerGroup: UserLevel;

  @OneToMany(() => UserLoan, (userLoan) => userLoan.user)
  userLoans: UserLoan[];

  @OneToMany(() => UserDescription, (desc) => desc.user)
  userDescriptions: UserDescription[];

  @OneToMany(() => UserFileAttachment, (file) => file.file)
  attachments: UserFileAttachment[];

  @Column({ name: 'activity_field' })
  activityField: string = '';

  fullName() {
    if (this.isLegal) {
      return this.companyName;
    } else {
      return [this.firstName, this.lastName].filter((x) => !!x).join(' ');
    }
  }

  hasRole(role: Role): boolean {
    return this.roles?.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole(Role.Admin);
  }

  hasSingleRole() {
    return this.roles.length === 1;
  }

  isJustAdmin() {
    return this.hasSingleRole() && this.isAdmin();
  }

  isMembership(): boolean {
    return this.hasRole(Role.Membership);
  }

  isJustMembership() {
    return this.hasSingleRole() && this.isMembership();
  }

  isContractor(): boolean {
    return this.hasRole(Role.Contactor);
  }

  isJustContractor() {
    return this.hasSingleRole() && this.isContractor();
  }

  hasAccessToSaleUnit(saleUnitId: number) {
    if (this.isAdmin()) {
      return true;
    } else {
      return !!this.accessShops?.find((s) => s.id == saleUnitId);
    }
  }

  isUser(): boolean {
    return this.hasRole(Role.User);
  }
}
