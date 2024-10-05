import {applyDecorators, UseGuards} from "@nestjs/common";
import { PermissionsGuard } from "../guard/permissions.guard";

export function Permissions(permissions: string[]) {
    return applyDecorators(
        UseGuards(PermissionsGuard(permissions))
    );
}