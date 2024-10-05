import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException
} from '@nestjs/common';
import { BaseController } from '../../../common/controller/base.controller';
import { StandSetting } from '../entities/StandSetting.entity';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { User } from '../../../base/entities/User';
import { SaleUnitService } from '../../../base/service/sale-unit.service';
import { ApiTags } from '@nestjs/swagger';
import { Not } from 'typeorm';

@ApiTags('stand-setting')
@Controller('/api/stand-setting')
export class StandSettingController extends BaseController<StandSetting> {
  constructor(private readonly saleUnitService: SaleUnitService) {
    super(StandSetting, PermissionKey.BASE);
  }

  async prepareEdit(
    model: StandSetting,
    entity: StandSetting,
    current: User
  ): Promise<StandSetting> {
    const updatedEntity = await super.prepareEdit(model, entity, current);
    const standSetting = await StandSetting.findOne({
      where: { id: updatedEntity.id }
    });
    if (!standSetting) {
      throw new NotFoundException('setting not found');
    }
    if (updatedEntity.title) {
      const duplicateTitle = await StandSetting.findOne({
        where: { title: updatedEntity.title, id: Not(standSetting.id) }
      });
      if (duplicateTitle) {
        throw new ConflictException('title is already exist');
      }
    }
    if (updatedEntity.saleUnit) {
      const saleUnit = await this.saleUnitService.findSaleUnitById(
        entity.saleUnit as any
      );
      if (!saleUnit) {
        throw new BadRequestException('sale unit not found');
      }
    }
    return entity;
  }

  async prepareCreate(
    model: StandSetting,
    current: User
  ): Promise<StandSetting> {
    const entity = await super.prepareCreate(model, current);
    const duplicateTitle = await StandSetting.findOne({
      where: { title: entity.title }
    });
    if (duplicateTitle) {
      throw new ConflictException('title is already exist');
    }
    const saleUnit = await this.saleUnitService.findSaleUnitById(
      entity.saleUnit as any
    );
    if (!saleUnit) {
      throw new BadRequestException('sale unit not found');
    }
    entity.saleUnit = [saleUnit];
    return entity;
  }

  additionalPermissions(): string[] {
    return [];
  }
}
