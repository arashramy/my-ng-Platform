import {ProductContractor} from '../../automation/base/entities/ProductContractor';
import {Transaction} from '../../automation/operational/entities/Transaction';
import {SaleOrder} from '../../automation/operational/entities/SaleOrder';
import {BaseController} from '../../common/controller/base.controller';
import {Role, User} from '../entities/User';
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    ParseIntPipe,
    Post,
    Query,
    forwardRef
} from '@nestjs/common';
import {PermissionAction, PermissionKey} from '../../common/constant/auth.constant';
import {HashHelper} from '../../common/helper/hash.helper';
import {CurrentUser} from '../../auth/decorators/current-user.decorator';
import {
    createQueryForEntity,
    createQueryWithoutPaging
} from '../../common/decorators/mvc.decorator';
import {UsersService} from '../../auth/service/users.service';
import {SaleUnit} from '../entities/SaleUnit';
import {UpdateResult} from 'typeorm/query-builder/result/UpdateResult';
import {WorkGroup} from '../entities/WorkGroup';
import {
    Between,
    DataSource,
    Equal,
    In,
    LessThanOrEqual,
    MoreThanOrEqual
} from 'typeorm';
import {FiscalYear} from '../entities/FiscalYears';
import {Bank} from '../entities/Bank';
import {OrganizationUnit} from '../entities/OrganizationUnit';
import {UserSmsPanel} from '../entities/UserSmsPanel';
import {SaleOrderService} from '../../automation/operational/service/sale-order.service';
import moment, {now} from 'moment';
import {AppConstant} from '../../common/constant/app.constant';
import {HttpService} from '@nestjs/axios';
import {ConfigService} from '@nestjs/config';
import {catchError, firstValueFrom} from 'rxjs';
import momentJalali from 'moment-jalaali';
import {EventEmitter2} from '@nestjs/event-emitter';
import {EventsConstant} from '../../common/constant/events.constant';
import {UserLoan} from '../../automation/operational/entities/UserLoan';
import {SaleItem} from '../../automation/operational/entities/SaleItem';
import { SaleUnitType } from '../../automation/operational/entities/SaleItem';

@Controller('/api/users')
export class UsersController extends BaseController<User> {
    constructor(
        private userService: UsersService,
        @Inject(forwardRef(() => SaleOrderService))
        public saleOrderService: SaleOrderService,
        private http: HttpService,
        private config: ConfigService,
        private eventEmitter: EventEmitter2,
        private dataSource: DataSource
    ) {
        super(User, PermissionKey.BASE_USERS);
    }

    @Post('/config-sms')
    configPanelSMS(@Body() body: UserSmsPanel) {
        return UserSmsPanel.save(UserSmsPanel.create(body));
    }

    @Get('financial-state/:id')
    async finantialState(@Param('id', ParseIntPipe) id: number) {
        const orders = await SaleOrder.find({
            where: {
                user: {id}
            },
            relations: {
                lockers: true,
                items: {
                    product: true,
                },
            }
        });

        const user = await User.findOne({where: {id}});

        const userLoans = await UserLoan.find({
            where: {user: {id}},
            relations: {items: true}
        });
        const current = moment().utc(true).format(AppConstant.DATE_FORMAT);
        const chargingServices = await this.dataSource
            .createQueryBuilder(SaleItem, 'q')
            .leftJoinAndSelect('q.user', 'user')
            .leftJoinAndSelect('q.product', 'product')
            .leftJoin('product.schedules', 'schedules')
            .where(
                `(q.type = ${SaleUnitType.Credit}) AND (q.start_date <= :start_date AND q.end_date >= :end_date) AND (q.credit > q.used_credit AND q.status = 0)`,
                {
                    start_date: current,
                    end_date: current
                }
            )
            .andWhere(`(q.user = :id AND q.consumer is null) OR (q.consumer = :id)`, {
                id
            })
            .andWhere(
                `(schedules.id IS NULL OR (schedules.days::jsonb @> '${moment(
                    now()
                ).isoWeekday()}' AND
          schedules.from_time <= :time AND schedules.to_time > :time))`,
                {
                    time: moment(now()).utc(true).format('HH:mm:ss')
                }
            )
            .getMany();

        return {
            dept: user.maxDeptAmount || 0,
            credit: user.credit,
            userLoans,
            orders: orders.filter(
                (element) =>
                    (element.totalAmount === 0 || element.totalAmount - element.settleAmount !== 0) &&
                    moment(element.submitAt, 'YYYY-MM-DD').isSame(moment(), 'date') &&
                    moment(element.submitAt, 'YYYY-MM-DD').isSame(moment(), 'year') &&
                    moment(element.submitAt, 'YYYY-MM-DD').isSame(moment(), 'month')
            ),
            chargingServices
        };
    }

    @Get('last')
    getLatestId() {
        return this.userService.getLastCode();
    }

    @Get('/info/:userId')
    async getUserInfo(@Param('userId', ParseIntPipe) userId: number) {
        const user = await User.findOne({
            where: {id: userId},
            relations: {userDescriptions: {saleUnit: true}}
        });
        if (!user) {
            throw new NotFoundException('user is not found');
        }
        const services = await this.saleOrderService.getValidRegisteredService(
            userId,
            undefined
        );
        return this.userService.getUserInfo(userId, services?.registeredServices);
    }

    @Get('/query')
    async query(@Query() params: any, @CurrentUser() current: User) {
        params.limit = params.limit || 10;
        const query = createQueryWithoutPaging(
            User,
            params,
            'autoComplete',
            current,
            this.req
        );
        if (params.saleUnit) {
            const saleUnit = await SaleUnit.findOne({
                where: {id: params.saleUnit},
                cache: true
            });
            if (!saleUnit) {
                return [];
            }
            if (saleUnit.isType(SaleUnitType.Reception)) {
                const ids = [saleUnit.id];
                if (saleUnit.receptionId && !saleUnit.allowSettle) {
                    ids.push(saleUnit.receptionId);
                }
                query.addSelect('rec.id', 'q_reception');
                query.leftJoin(
                    SaleOrder,
                    'rec',
                    `rec.user = q.id AND rec.end IS NULL AND rec.reception = true AND rec.sale_unit IN (${ids.join(
                        ','
                    )})`
                );
                if (saleUnit.receptionId && !saleUnit.allowSettle)
                    query.andWhere(
                        `(NOT (q.user_roles::jsonb ? '${Role.Membership}') OR (rec.id IS NOT NULL AND q.user_roles::jsonb ? '${Role.Membership}'))`
                    );
                const result = await query
                    .limit(params.limit || 50)
                    .getRawAndEntities();
                const maps = {};
                for (let i = 0; i < result.raw.length; i++) {
                    maps[result.raw[i].q_id] = result.raw[i].q_reception;
                }
                for (let i = 0; i < result.entities.length; i++) {
                    result.entities[i].reception = maps[result.entities[i].id];
                }
                return result.entities;
            }
        }
        return query
            .limit(+params.limit)
            .take(+params.take || 0)
            .getMany();
    }

    @Get('/mobile/:mobile')
    async findByMobile(@Param('mobile') mobile: string) {
        return this.userService.findByUsername(mobile);
    }

    @Get('/credit/:id')
    async credit(@Param('id') id: number) {
        if (id) return (await User.findOneBy({id: id}))?.credit;
        return null;
    }

    @Get('/all')
    async getUserBasePeriod(@Query() params: any, @CurrentUser() current: User) {
        console.log("somthing . ");

        let where: any = {};
        const query = User.createQueryBuilder('q')
            .leftJoin('q.createdBy', 'createdBy')
            .leftJoin('q.deletedBy', 'deletedBy')
            .leftJoin('q.updatedBy', 'updatedBy')
            .leftJoin('q.parent', 'parent');

        if (params.start && params.end) {
            where['createdAt'] = Between(
                moment(params.start).format(AppConstant.DATE_FORMAT),
                moment(params.end).add(1, 'day').format(AppConstant.DATE_FORMAT)
            );
        } else if (params.start) {
            where['createdAt'] = MoreThanOrEqual(
                moment(params.start).format(AppConstant.DATE_FORMAT)
            );
        } else if (params.end) {
            where['createdAt'] = LessThanOrEqual(
                moment(params.start).format(AppConstant.DATE_FORMAT)
            );
        }

        query.where(`q.user_roles::jsonb ? '${Role.Membership}'`);
        query.andWhere(where);

        const [content, total] = await query.getManyAndCount();

        return {content, total};
    }

    @Get('/insurance/:nationalCode')
    async InsuranceApi(@Param('nationalCode') nationalCode: any) {
        console.log(nationalCode);
        console.log(this.config.get('INSURANCE_URL'));
        let response = {
            nationalCode: nationalCode,
            nationalityCode: 0,
            firstName: '',
            lastName: '',
            provinceTitle: '',
            cityTitle: '',
            areaTitle: '',
            gymTitle: '',
            federationTitle: '',
            sportBranchTitle: '',
            persianExpireDate: momentJalali().add(1, 'month').format('jYYYY/jM/jD'),
            membershipIsExpired: true
        };
        const password = this.config.get('INSURANCE_PASSWORD');
        const userName = this.config.get('INSURANCE_USER_NAME');
        const url = this.config.get('INSURANCE_URL');

        const user = await User.findOne({where: {nationCode: nationalCode}});

        if (!user) {
            throw new BadRequestException('user not found');
        }

        if (!userName || !password || !nationalCode) {
            throw new BadRequestException('data is not compelete');
        }

        console.log(
            'the url is',
            `${url}?nationalCode=${nationalCode}&userName=${userName}&password=${password}`
        );

        try {
            const x = await firstValueFrom(
                this.http.get(
                    `${url}?nationalCode=${nationalCode}&userName=${userName}&password=${password}`,
                    {
                        timeout: 1000,
                        headers: {
                            'Content-Type': 'aplication/json'
                        }
                    }
                )
            );
            response = x.data[0];
        } catch (error) {
            throw new BadRequestException(
                error?.response?.data ||
                'Could not connect to the federation. Please try again'
            );
        }

        console.log('response insurancee', response);

        if (response.persianExpireDate) {
            const date = momentJalali(response.persianExpireDate, 'jYYYY/jM/jD');
            if (date.isValid()) {
                user.insuranceExpiredDate = date.format(
                    AppConstant.DATETIME_FORMAT
                ) as any;
                await user.save();
                this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
            }
        }

        return {
            status: 200,
            message: 'successfully',
            data: {
                ...response,
                firstName: (response as any)?.firstName || user.firstName,
                lastName: (response as any)?.lastName || user.lastName
            }
        };
    }

    @Post('/get-or-create')
    async getOrCreate(@Body() user: any, @CurrentUser() current: User) {
        const oldUser = await this.userService.findByUsername(user.mobile);
        if (oldUser) {
            return oldUser;
        }
        user.createdBy = current;
        return this.userService.create(user);
    }

    @Post('send-happy-birthday')
    async sendHappyBirthday(@Body('users') users: number[]) {
        console.log('sendHappyBirthday controller', users);
        return await this.userService.sendHappyBirthday(users);
    }

    async prepareEdit(model: User, entity: User, current: User): Promise<User> {
        if (model.code) {
            const userExistByCode = await this.userService.findByCode(model.code);
            if (userExistByCode && userExistByCode.id !== entity.id) {
                throw new BadRequestException('User exist By This Code');
            }
        }
        if (model.mobile) {
            const userExistByCode = await User.findOne({
                where: {mobile: model.mobile}
            });
            if (userExistByCode && userExistByCode?.id !== entity.id) {
                throw new BadRequestException('User exist By This phone');
            }
        }
        for (let key of Object.keys(model)) {
            if (key == 'password') {
                if (model[key] && model[key] != '')
                    entity.password = await HashHelper.hash(model.password);
            } else if (key === 'groups') {
                const groupId = model.groups?.map((g) => g.id);
                if (groupId?.length) {
                    entity.groups = await WorkGroup.findBy({id: In(groupId)});
                } else {
                    entity.groups = [];
                }
            } else if (key === 'accessFiscalYears') {
                const fiscalIds = model.accessFiscalYears?.map((g) => g.id);
                if (fiscalIds?.length) {
                    entity.accessFiscalYears = await FiscalYear.findBy({
                        id: In(fiscalIds)
                    });
                } else {
                    entity.accessFiscalYears = [];
                }
            } else if (key === 'accessOrganizationUnits') {
                let orgIds = model.accessOrganizationUnits?.map((g) => g.id);
                if (orgIds?.length) {
                    entity.accessOrganizationUnits = await OrganizationUnit.findBy({
                        id: In(orgIds)
                    });
                } else {
                    entity.accessOrganizationUnits = [];
                }
            } else if (key === 'accessShops') {
                let shopIds = model.accessShops?.map((g) => g.id);
                if (shopIds?.length) {
                    entity.accessShops = await SaleUnit.findBy({id: In(shopIds)});
                } else {
                    entity.accessShops = [];
                }
            } else if (key === 'accessBanks') {
                let banksId = model.accessBanks?.map((g) => g.id);
                if (banksId?.length) {
                    entity.accessBanks = await Bank.findBy({id: In(banksId)});
                } else {
                    entity.accessBanks = [];
                }
            } else {
                entity[key] = model[key];
            }
        }
        entity.updatedBy = current;
        return entity;
    }

    async postEdit(model: User, entity: User, current: User): Promise<User> {
        await this.userService.delCache(entity.id);
        return super.postEdit(model, entity, current);
    }

    @Post()
    async create(@Body() model: any, @CurrentUser() current: User) {
        return this.userService.crearteUserAndAssignEssentialEntity(model, current);
    }

    additionalPermissions(): string[] {
        return [PermissionKey.AUTOMATION_OPT_MEMBERSHIP,`${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}` ];
    }

    additionalPostPermissions(): string[] {
        return [PermissionKey.AUTOMATION_OPT_MEMBERSHIP,`${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.CREATE}`];
    }

    async prepareDelete(id: number | number[]): Promise<void> {
        const saleOrder = await SaleOrder.count({
            where: {user: {id: id as number}}
        });
        if (saleOrder > 0) {
            throw new BadRequestException(
                'You Cant Delete User When Use in Sale Order'
            );
        }
        const transactions = await Transaction.count({
            where: {user: {id: id as number}}
        });
        if (transactions > 0) {
            throw new BadRequestException(
                'You Cant Delete User When Use in Transactions'
            );
        }
        const contractors = await ProductContractor.count({
            where: {contractor: {id: id as number}}
        });
        if (contractors > 0) {
            throw new BadRequestException(
                'You Cant Delete User When Use in Contractor'
            );
        }
        const parent = await User.count({
            where: {parent: {id: id as number}}
        });
        if (parent > 0) {
            throw new BadRequestException('You Cant Delete User When Use in parent');
        }
    }

    async postDelete(
        id: number[] | number,
        result: UpdateResult,
        current: User
    ): Promise<boolean> {
        if (Array.isArray(id)) {
            for (const key of id) {
                await this.userService.delCache(key);
            }
        } else {
            await this.userService.delCache(id as number);
        }
        return super.postDelete(id, result, current);
    }
}
