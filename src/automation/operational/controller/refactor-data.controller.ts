import { Controller, Post } from '@nestjs/common';
import { User } from '../../../base/entities/User';
import { ContractorIncome } from '../entities/ContractorIncome';
import { SaleItem, SaleUnitType } from '../entities/SaleItem';
import { ContractorService } from '../../../automation/base/service/contractor.service';
import { IsNull, MoreThan } from 'typeorm';
import { ProductType } from '../../../automation/base/entities/ProductCategory';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('/api/refactor/')
export class RefactorDataController {
  constructor(
    private contractorService: ContractorService,
    @InjectQueue('fix-saleItem-remainCredit') public remainCreditQueue: Queue
  ) {}

  @Post('/fix-reception-contractor') //اونایی که پذیرش خوردن و اپدیت شدن ولی گزارش اپدیت نشده
  async fixReceptionRegContractor() {
    console.log('hi sale item');
    const current = await User.findOne({ where: { id: 2 } });
    const [content, total] = await ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.saleItem', 'saleItem')
      .leftJoin('saleItem.contractor', 'sc')
      .leftJoinAndSelect('q.user', 'user')
      .where('saleItem.contractor is not null')
      .andWhere('q.user != sc.id')
      .andWhere('q.amount!=1')
      .getManyAndCount();

    const array = [];
    const datas = [];
    console.log('length', content.length);
    for (let index = 0; index < content.length; index++) {
      const c = content[index];

      array.push(content[index]);
      c.deletedAt = new Date();
      c.deletedBy = current;
      c.amount = 1;
      await c.save();
    }

    for (let index = 0; index < content.length; index++) {
      const s = await SaleItem.findOne({
        where: { id: content[index].saleItem.id },
        relations: {
          contractorIncomes: true,
          product: true,
          registeredService: true
        }
      });
      const q = await this.contractorService.processContractorIncome(
        s,
        s.product,
        current,
        null,
        true
      );

      if (q) {
        s.contractorIncomes.push(q);
        await s.save();
      }

      datas.push(q);
    }

    return { content: datas, total: datas.length };
  }

  @Post('/fix-deleted-contractor') //saleItem داره ولی contractor نداره
  async fixContractorDeleted() {
    const current = await User.findOne({ where: { id: 2 } });
    const [content, total] = await SaleItem.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.contractorIncomes', 'contractorIncomes')
      .leftJoin('q.contractor', 'contractor')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoinAndSelect('q.registeredService', 'registeredService')
      .where('q.deleted_at is null')
      .andWhere(
        '((contractorIncomes.id IS NULL) OR (contractorIncomes.deleted_at IS NOT NULL AND contractorIncomes.amount >1))'
      )
      .andWhere('q.contractor is not null')
      .getManyAndCount();

    console.log('fixContractorDeleted', content.length);

    const datas = [];

    for (let index = 0; index < content.length; index++) {
      const s = content[index];
      const q = await this.contractorService.processContractorIncome(
        s,
        s.product,
        current,
        null,
        true
      );

      if (q) {
        s.contractorIncomes.push(q);
        await s.save();
        datas.push(q);
      }
    }

    return { content: datas, total: datas.length };
  }

  @Post('/fix-deleted-saleItem-contractor') //اول با کانترکتور بوده و بعد پاکش کرده
  async fixContractorDeletedSaleItem() {
    const current = await User.findOne({ where: { id: 2 } });
    const [content, total] = await ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.saleItem', 'saleItem')
      .andWhere('saleItem.contractor is null')
      .andWhere('q.amount!=1')
      .getManyAndCount();

    const array = [];

    for (let index = 0; index < content.length; index++) {
      const c = content[index];

      array.push(content[index]);
      c.deletedAt = new Date();
      c.deletedBy = current;
      c.amount = 1;
      await c.save();
    }

    return { content: array, total: array.length };
  }

  @Post('fix-contractor-data')
  async fixContractorData() {
    const res1 = (await this.fixReceptionRegContractor()).content;
    const res2 = (await this.fixContractorDeleted()).content;
    const res3 = (await this.fixContractorDeletedSaleItem()).content;
    return [...res1, ...res2, ...res3];
  }

  @Post('fix-remain-credit')
  async fixRemainCreditData() {
    const regs = await SaleItem.find({
      where: {
        type: SaleUnitType.Service,
        registeredService: IsNull(),
        product: { type: ProductType.Service }
      },
      relations: {
        product: true,
        registeredService: true
      }
    });
    const chuck_length = Math.ceil(regs.length / 10);
    const array = [];
    // for (let index = 0; index < regs.length; index++) {
    //   const reg = regs[index];

    //   const receptions = await SaleItem.find({
    //     where: { registeredService: { id: reg.id } },
    //     relations: { registeredService: true },
    //     order: { id: 'ASC' }
    //   });

    //   for (let index = 0; index < receptions.length; index++) {
    //     const element = receptions[index];
    //     const sum = await SaleItem.createQueryBuilder('q')
    //       .select('SUM(q.quantity)', 'sum')
    //       .leftJoin('q.registeredService', 'registeredService')
    //       .where('q.registeredService=:reg', { reg: reg.id })
    //       .andWhere(`q.id < ${element.id}`)
    //       .getRawMany();

    //     if (
    //       reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0) !==
    //       element.remainCredit
    //     ) {
    //       console.log('error');
    //       element.remainCredit =
    //         reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0);
    //       element.save();
    //       array.push({
    //         reg: reg.id,
    //         reception: element.id,
    //         curr: element.remainCredit,
    //         fix: reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0)
    //       });
    //     }
    //   }
    // }
    //-------------------------------

    for (let index = 0; index < chuck_length; index++) {
      console.log(index,chuck_length)
      const data = regs.splice(0, 10);
      this.remainCreditQueue.add(data);

        // const receptions = await SaleItem.find({
        //   where: { registeredService: { id: reg.id } },
        //   relations: { registeredService: true },
        //   order: { id: 'ASC' }
        // });

        // for (let index = 0; index < receptions.length; index++) {
        //   const element = receptions[index];
        //   const sum = await SaleItem.createQueryBuilder('q')
        //     .select('SUM(q.quantity)', 'sum')
        //     .leftJoin('q.registeredService', 'registeredService')
        //     .where('q.registeredService=:reg', { reg: reg.id })
        //     .andWhere(`q.id < ${element.id}`)
        //     .getRawMany();

        //   if (
        //     reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0) !==
        //     element.remainCredit
        //   ) {
        //     console.log('error');
        //     // element.remainCredit =
        //     //   saleItem.credit - (+sum[0].sum || 0) - (+element.quantity || 0);
        //     // element.save();
        //     array.push({ reg: reg.id, reception: element.id });
        //   }
        // }
    }
 
  }
}
