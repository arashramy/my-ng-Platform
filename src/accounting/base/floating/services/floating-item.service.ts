import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AccountFloatingService } from './floating.service';
import { AccountingFloatingItem } from '../entities/floating-item.entity';
import { CreateFloatingItemDTO } from '../dtos/create-floating-item.dto';
import { UpdateFloatingItemDTO } from '../dtos/update-floating-item.dto';
import { FindOptionsWhere, Not } from 'typeorm';
import { FloatingType } from '../entities/floating.entity';

type FindDuplicateItem = FindOptionsWhere<AccountingFloatingItem>;

@Injectable()
export class AccountFloatingItemService {
  constructor(private readonly floatingService: AccountFloatingService) {}

  async findDuplicateItem(where: FindDuplicateItem[] | FindDuplicateItem) {
    const duplicateName = await AccountingFloatingItem.findOne({
      where,
    });

    if (duplicateName) {
      throw new BadRequestException('floating item duplicated ....');
    }
  }

  async create(dto: CreateFloatingItemDTO) {
    const floating = await this.floatingService.findById(dto.floating);
    await this.findDuplicateItem([
      {
        name: dto.name,
        floating: { type: floating.type },
      },
      {
        code: dto.code,
        floating: { type: floating.type },
      },
    ]);
    return AccountingFloatingItem.save(
      AccountingFloatingItem.create({
        name: dto.name,
        code: dto.code,
        floating,
      }),
    );
  }

  async findById(id: number, relations: string[] = []) {
    const floatingItem = await AccountingFloatingItem.findOne({
      where: { id },
      relations,
    });
    if (!floatingItem) {
      throw new NotFoundException('floating item is not found ...');
    }
    return floatingItem;
  }

  async delete(id: number) {
    const floatingItem = await this.findById(id);
    const deleteResult = await AccountingFloatingItem.delete(floatingItem.id);
    if (deleteResult.affected === 0) {
      throw new InternalServerErrorException(
        'deleting floating item cant happen',
      );
    }
    return { isSuccess: true };
  }

  async update(id: number, dto: UpdateFloatingItemDTO) {
    const floatingItem = await this.findById(id, ['floating']);
    if (dto.name) {
      await this.findDuplicateItem({
        name: dto.name,
        floating: { type: floatingItem.floating.type },
        id: Not(floatingItem.id),
      });

      floatingItem.name = dto.name;
    }
    if (dto.code) {
      await this.findDuplicateItem({
        code: dto.code,
        floating: { type: floatingItem.floating.type },
        id: Not(floatingItem.id),
      });

      floatingItem.code = dto.code;
    }
    await AccountingFloatingItem.save(floatingItem);
    return { isSuccess: true };
  }

  getItems(type: FloatingType) {
    return AccountingFloatingItem.find({
      where: { floating: { type } },
      relations: ['floating'],
    });
  }
}
