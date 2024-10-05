import { AccountingCoding, CodingType } from './coding.entity';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCoding } from './dtos/create-coding.dto';
import { FindOneByCodingDTO } from './dtos/find-coding.dto';
import { DataSource, In } from 'typeorm';
import { UpdateCodingDTO } from './dtos/update-coding.dto';
import { FiscalYear } from '../../../base/entities/FiscalYears';

@Injectable()
export class AccountCodingService {
  constructor(private readonly datasource: DataSource) {}

  findOneByCoding(dto: FindOneByCodingDTO) {
    return AccountingCoding.findOne({
      where: { coding: dto.coding, codingType: dto.codingType },
    });
  }

  async findByIds(ids: number[]) {
    const codings = await AccountingCoding.find({ where: { id: In(ids) } });
    if (codings.length !== ids.length) {
      throw new BadRequestException('codings are invalid');
    }
    return codings;
  }

  async findById(id: number, relations: string[] = []) {
    const coding = await AccountingCoding.findOne({ where: { id }, relations });
    if (!coding) {
      throw new NotFoundException('coding is not found');
    }
    return coding;
  }

  async deleteCodingById(id: number) {
    const coding = await this.findById(id, ['children']);
    if (coding.children.length > 0) {
      throw new BadRequestException('your coding has sub items ...');
    }
    const deletedResult = await AccountingCoding.delete(coding.id);
    if (!deletedResult.affected) {
      throw new InternalServerErrorException('server could not delete ....');
    }
    return { isDelete: true };
  }

  async createCoding(dto: CreateCoding) {
    const codingDuplicated = await this.findOneByCoding({
      coding: dto.coding,
      codingType: dto.codingType || CodingType.Group,
    });
    if (codingDuplicated) {
      throw new BadRequestException('coding is duplicated ...');
    }
    const fiscalYear = await FiscalYear.findOne({
      where: { id: dto.fiscalYear },
    });
    if (!fiscalYear) {
      throw new NotFoundException('fiscal year is not found ...');
    }
    const newCoding = AccountingCoding.create({
      coding: dto.coding,
      codingType: dto.codingType || CodingType.Group,
      name: dto.name,
      codingGroupType: dto?.codingGroupType,
      fiscalYear,
    });
    if (dto.codingType && dto.codingType !== CodingType.Group) {
      newCoding.parent = await this.findById(dto.parentCoding);
    }
    return AccountingCoding.save(newCoding);
  }

  async findTrees() {
    return await this.datasource
      .getTreeRepository(AccountingCoding)
      .findTrees({ relations: ['fiscalYear'] });
  }

  async updateById(id: number, dto: UpdateCodingDTO) {
    const codingEntity = await this.findById(id);
    if (codingEntity.codingType === CodingType.Group) {
      throw new BadRequestException(
        'coding group is constants you cant change',
      );
    }
    if (dto.coding) {
      const codingDuplicated = await this.findOneByCoding({
        coding: dto.coding,
        codingType: codingEntity.codingType,
      });
      if (codingDuplicated && codingDuplicated.id !== codingEntity.id) {
        throw new BadRequestException('the coding is duplicated ...');
      }
      codingEntity.coding = dto.coding;
    }
    if (dto.name) {
      codingEntity.name = dto.name;
    }
    await AccountingCoding.save(codingEntity);
    return { isSuccess: true };
  }
}
