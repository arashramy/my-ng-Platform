import { BadRequestException, Controller } from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { Location } from '../entities/Location';
import { Province } from '../entities/Province';
import { In } from 'typeorm';
import { City } from '../entities/City';
import { Role } from '../entities/User';

@Controller('/api/province')
export class ProvinceController extends BaseController<Province> {
  constructor() {
    super(Province, PermissionKey.BASE_PROVINCE);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.BASE_PROVINCE,
      `${PermissionKey.BASE_PROVINCE}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_PROVINCE}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_PROVINCE}_${PermissionAction.UPDATE}`,
      PermissionKey.BASE_CITY,
      `${PermissionKey.BASE_CITY}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_CITY}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_CITY}_${PermissionAction.UPDATE}`,
      PermissionKey.BASE_AREA,
      `${PermissionKey.BASE_AREA}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_AREA}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_AREA}_${PermissionAction.UPDATE}`,
      Role.User,
      Role.Membership
    ];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const locations = await Location.count({
      where: { province: { id: Array.isArray(id) ? In(id) : id } }
    });
    if (locations > 0) {
      throw new BadRequestException(
        'you cant delete province when use in location'
      );
    }

    const cities = await City.count({
      where: { province: { id: Array.isArray(id) ? In(id) : id } }
    });
    if (cities > 0) {
      throw new BadRequestException(
        'you cant delete province when use in city'
      );
    }
  }
}
