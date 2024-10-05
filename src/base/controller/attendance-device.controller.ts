import {Controller} from "@nestjs/common";
import {PermissionKey} from "../../common/constant/auth.constant";
import {BaseController} from "../../common/controller/base.controller";
import {AttendanceDevice} from "../entities/AttendanceDevice";

@Controller("/api/attendance-device")
export class AttendanceDeviceController extends BaseController<AttendanceDevice> {
    constructor() {
        super(AttendanceDevice, PermissionKey.BASE_ATTENDANCE_DEVICE);
    }

    additionalPermissions(): any[] {
        return [];
    }
}
