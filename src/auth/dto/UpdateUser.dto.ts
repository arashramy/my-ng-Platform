import {PartialType} from '@nestjs/mapped-types';
import {User} from "../../base/entities/User";

export class UpdateUserDto extends PartialType(User) {
}
