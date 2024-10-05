import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/base/entities/User";
import { BaseController } from "src/common/controller/base.controller";

@Controller('/api/report/users')
export class UsersReportController {
    constructor(
       ) {


    }
    @Get('users')
    async findPage(@Query() params: any, @CurrentUser() current: User) {
      console.log("hi",);
 
    }
  

}