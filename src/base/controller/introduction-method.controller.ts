import {Controller} from "@nestjs/common";
import {IntroductionMethod} from "../entities/IntroductionMethod";
import {PermissionAction, PermissionKey} from "../../common/constant/auth.constant";
import {BaseController} from "../../common/controller/base.controller";

@Controller("/api/introduction")
export class IntroductionMethodController extends BaseController<IntroductionMethod> {
    constructor() {
        super(IntroductionMethod, PermissionKey.BASE_INTRODUCTION_METHOD);
    }


    additionalPermissions(): any[] {
        return [PermissionKey.BASE_USERS,
            `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`,
            `${PermissionKey.BASE_USERS}_${PermissionAction.CREATE}`,
            `${PermissionKey.BASE_USERS}_${PermissionAction.UPDATE}`];
    }
}
