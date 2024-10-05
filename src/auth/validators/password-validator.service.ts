import {Injectable} from "@nestjs/common";
import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface
} from "class-validator";
import {ExtendedValidationArguments} from "./extended.validation.arguments";
import {UsersService} from "../service/users.service";
import {REQUEST_CONTEXT} from "../../common/interceptors/inject-user.interceptor";
import {HashHelper} from "../../common/helper/hash.helper";
import {User} from "../../base/entities/User";

@ValidatorConstraint({name: 'PasswordValidator', async: true})
@Injectable()
export class PasswordValidator implements ValidatorConstraintInterface {
    constructor(private userService: UsersService) {
    }

    async validate(value?: string, args?: ExtendedValidationArguments) {
        const user = await User.findOneBy({id: args.object[REQUEST_CONTEXT].user.sub});
        if (user) {
            if (!user.forceChangePassword) {
                return await HashHelper.match(user.password, value);
            } else {
                return true;
            }
        }
        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Invalid password`;
    }
}

export function PasswordValidate(validationOptions?: ValidationOptions) {
    return function (object: any, propertyName: string) {
        registerDecorator({
            name: 'PasswordValidate',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: PasswordValidator,
        });
    };
}