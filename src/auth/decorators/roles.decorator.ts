import {applyDecorators, UseGuards} from "@nestjs/common";
import {RolesGuard} from "../guard/roles.guard";


export function Roles(roles: string[]) {
    return applyDecorators(
        UseGuards(RolesGuard(roles))
    );
}