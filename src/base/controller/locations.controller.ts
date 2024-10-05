import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { Location } from '../entities/Location';
import { GroupClassRoom } from '../../automation/base/entities/GroupClassRoom';
import { DataSource } from 'typeorm';
import { Role, User } from '../entities/User';
import { City } from '../entities/City';
import { Province } from '../entities/Province';
import { UrbanArea } from '../entities/UrbanArea';

@Controller('/api/locations')
export class LocationsController extends BaseController<Location> {
  constructor(private ds: DataSource) {
    super(Location, PermissionKey.AUTOMATION_BASE_LOCATION);
  }

  @Get('/roots')
  getRoots() {
    return this.ds.getTreeRepository(Location).findRoots({
      relations: ['province', 'city', 'area', 'organizationUnit']
    });
  }

  prepareOwnParams(params: any, current: User) {
    const param = super.prepareOwnParams(params, current);
    return { ...param, user: current.id };
  }

  @Get('/descendants/:parent')
  async getDescendants(@Param('parent') parent: number) {
    let location = await Location.findOne({ where: { id: parent } });
    return this.ds.getTreeRepository(Location).findDescendants(location, {
      relations: ['organizationUnit', 'saleUnit']
    });
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_BASE_LOCATION,
      `${PermissionKey.AUTOMATION_BASE_GROUP_CLASS_ROOM}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_BASE_GROUP_CLASS_ROOM}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_BASE_GROUP_CLASS_ROOM}_${PermissionAction.UPDATE}`
    ];
  }

  additionalPostPermissions(): string[] {
    return [Role.Membership, Role.User];
  }

  async prepareCreate(model: Location, current: User): Promise<Location> {
    if (model?.province && model?.province?.title) {
      const province = await Province.findOne({
        where: { title: model?.province?.title }
      });

      if (province) {
        model.province = province;
      } else {
        const province = new Province();
        province.title = model?.province?.title;
        province.preCode = model?.province?.preCode;
        await province.save();
        model.province = province;
      }
    }
    if (model?.city && model?.city?.title) {
      const city = await City.findOne({ where: { title: model?.city?.title } });

      if (city) {
        model.city = city;
      } else {
        const city = new City();
        city.title = model.city.title;
        city.province = model.province;
        await city.save();
        model.city = city;
      }
    }
    if (model?.area && model?.area?.title) {
      const area = await UrbanArea.findOne({
        where: { title: model?.area?.title }
      });

      if (area) {
        model.area = area;
      } else {
        const area = new UrbanArea();
        area.title = model.area.title;
        area.province = model.province;
        area.city = model.city;
        await area.save();
        model.area = area;
      }
    }
    const entity = await super.prepareCreate(model, current);
    console.log('entity', entity);
    return entity;
  }
  async prepareDelete(id: number | number[]): Promise<void> {
    const locations = await GroupClassRoom.count({
      where: { location: { id: id as number } }
    });
    if (locations > 0) {
      throw new BadRequestException(
        'you cant delete category when use in product'
      );
    }
  }
}
