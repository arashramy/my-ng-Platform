import {BadRequestException, Controller} from '@nestjs/common';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {BaseController} from '../../common/controller/base.controller';
import {Location} from "../entities/Location";
import {In} from "typeorm";
import {UrbanArea} from "../entities/UrbanArea";

@Controller('/api/urban-area')
export class UrbanAreaController extends BaseController<UrbanArea> {
  constructor() {
    super(UrbanArea, PermissionKey.BASE_AREA);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.BASE_LOCATION,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_LOCATION}_${PermissionAction.UPDATE}`
    ];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const locations = await Location.count({
      where: {area: {id: Array.isArray(id) ? In(id) : id}},
    });
    if (locations > 0) {
      throw new BadRequestException(
          'you cant delete area when use in location',
      );
    }
  }
}
