import { Transform } from 'class-transformer';
import { Image } from '../../../base/dto/image.dto';

export class ContractorIncomeReportDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  id?: number;
  code?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  // @Transform(params => {
  //     try {
  //         if (typeof params.obj.profile == 'string')
  //             return JSON.parse(params.obj.profile);
  //         else if(typeof params.obj.profile == 'object')
  //             return params.obj.profile;
  //         else
  //             return null;
  //     } catch (e) {
  //         return null;
  //     }
  // })
  // profile?: Image;
  @Transform((params) => (params?.value ? +params.value : 0))
  quantity?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  discount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  amount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  amountAfterDiscount?: number;
  // @Transform(params => params?.value ? +params.value : 0)
  // credit?: number;
  // @Transform(params => params?.value ? +params.value : 0)
  // usedCredit?: number
}
