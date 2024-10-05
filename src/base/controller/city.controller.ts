import {BadRequestException, Controller} from '@nestjs/common';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {BaseController} from '../../common/controller/base.controller';
import {Location} from "../entities/Location";
import {In} from "typeorm";
import {City} from "../entities/City";
import {UrbanArea} from "../entities/UrbanArea";
import { Role } from '../entities/User';

@Controller('/api/city')
export class CityController extends BaseController<City> {
  constructor() {
    super(City, PermissionKey.BASE_CITY);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.BASE_LOCATION,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.UPDATE}`,
      Role.User,
      Role.Membership
    ];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const locations = await Location.count({
      where: {province: {id: Array.isArray(id) ? In(id) : id}},
    });
    if (locations > 0) {
      throw new BadRequestException(
          'you cant delete city when use in location',
      );
    }
    const areas = await UrbanArea.count({
      where: {city: {id: Array.isArray(id) ? In(id) : id}},
    });
    if (areas > 0) {
      throw new BadRequestException(
          'you cant delete city when use in urban area',
      );
    }
  }
}
