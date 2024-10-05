import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';

@Injectable()
@Processor('fix-saleItem-remainCredit')
export class RemainCreditServiceProcess {
  @Process()
  async fixData({ data }: Job<SaleItem[]>) {


    
    for (let i = 0; i < data.length; i++) {
      const reg = data[i];
      const receptions = await SaleItem.find({
        where: { registeredService: { id: reg.id } },
        relations: { registeredService: true },
        order: { id: 'ASC' }
      });

      for (let index = 0; index < receptions.length; index++) {
        const element = receptions[index];
        const sum = await SaleItem.createQueryBuilder('q')
          .select('SUM(q.quantity)', 'sum')
          .leftJoin('q.registeredService', 'registeredService')
          .where('q.registeredService=:reg', { reg: reg.id })
          .andWhere(`q.id < ${element.id}`)
          .getRawMany();

        if (
          reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0) !==
          element.remainCredit
        ) {
          console.log('error',reg.id,element.id);
          element.remainCredit =
            reg.credit - (+sum[0].sum || 0) - (+element.quantity || 0);
          element.save();
       
        }
      }
    }
  }
}
