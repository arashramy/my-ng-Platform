import {Controller} from "@nestjs/common";
import {PermissionAction, PermissionKey} from "../../common/constant/auth.constant";
import {BaseController} from "../../common/controller/base.controller";
import {ShiftWork} from "../entities/ShiftWork";

@Controller("/api/shift-work")
export class ShiftWorkController extends BaseController<ShiftWork> {
    constructor() {
        super(ShiftWork, PermissionKey.BASE_SHIFT_WORK);
    }


    additionalPermissions(): any[] {
        return [PermissionKey.BASE_USERS,
            `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`,
            `${PermissionKey.BASE_USERS}_${PermissionAction.CREATE}`,
            `${PermissionKey.BASE_USERS}_${PermissionAction.UPDATE}`];
    }
}
