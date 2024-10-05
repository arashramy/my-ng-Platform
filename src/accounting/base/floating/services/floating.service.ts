import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AccountingFloating, FloatingType } from '../entities/floating.entity';
import { AccountCodingService } from '../../coding/coding.service';
import { FindOptionsWhere, Not } from 'typeorm';
import { CreateFloatingDTO } from '../dtos/create-floating.dto';
import { UpdateFloatingDTO } from '../dtos/update-floating.dto';

@Injectable()
export class AccountFloatingService {
  constructor(private readonly codingsService: AccountCodingService) {}

  async findDuplicate(where: FindOptionsWhere<AccountingFloating>) {
    const floating = await AccountingFloating.findOne({
      where,
    });
    if (floating) {
      throw new BadRequestException(
        'floating duplicate with this name and type',
      );
    }
  }

  async create({ name, codings, type }: CreateFloatingDTO) {
    await this.findDuplicate({ name, type });
    const codingsEntity = await this.codingsService.findByIds(codings);
    return AccountingFloating.save(
      AccountingFloating.create({
        name,
        codings: codingsEntity,
        type,
      }),
    );
  }

  async findById(id: number) {
    const floating = await AccountingFloating.findOne({ where: { id } });
    if (!floating) {
      throw new NotFoundException('floating is not found');
    }
    return floating;
  }

  async deleteById(id: number) {
    const floating = await this.findById(id);
    const deleteResult = await AccountingFloating.delete(floating.id);
    if (deleteResult.affected === 0) {
      throw new InternalServerErrorException('could not delete floating');
    }
    return { isSuccess: true };
  }

  async update(id: number, dto: UpdateFloatingDTO) {
    const floating = await this.findById(id);
    if (dto.name) {
      await this.findDuplicate({
        name: dto.name,
        type: floating.type,
        id: Not(floating.id),
      });
      floating.name = dto.name;
    }
    if (dto.codings) {
      floating.codings = await this.codingsService.findByIds(dto.codings);
    }
    await AccountingFloating.save(floating);
    return { isSuccess: true };
  }

  selectAll(type: FloatingType) {
    return AccountingFloating.find({
      where: { type },
      relations: ['codings', 'items'],
    });
  }
}
