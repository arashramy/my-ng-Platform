import {Column, Entity, Like} from 'typeorm';
import {CoreEntity} from './CoreEntity';
import {IsNotEmpty} from 'class-validator';
import {UniqueValidate} from '../../common/validators/unique.validator';
import {GlobalFilter} from '../../common/decorators/mvc.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({name: '_introduction_method'})
export class IntroductionMethod extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(IntroductionMethod)
  @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
  @Column({name: 'title'})
  title?: string = '';
}
