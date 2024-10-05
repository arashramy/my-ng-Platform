
import {ValidationArguments} from "class-validator";
import {REQUEST_CONTEXT} from "../../common/interceptors/inject-user.interceptor";

export interface ExtendedValidationArguments extends ValidationArguments {
    object: {
        [REQUEST_CONTEXT]: {
            user: any; // User is my type for User class
        };
    };
}