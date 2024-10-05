import {IsNotEmpty} from "class-validator";
import {PasswordValidate} from "../validators/password-validator.service";

export class ChangePasswordDto {
    @PasswordValidate()
    oldPassword: string;
    @IsNotEmpty({message: 'Password is required'})
    password: string;
}