import {IsNotEmpty, IsPhoneNumber} from "class-validator";

export class ResetPasswordDto {
    @IsNotEmpty({message: 'Username is required'})
    @IsPhoneNumber('IR', {message: 'Mobile number is not valid'})
    username: string;
}