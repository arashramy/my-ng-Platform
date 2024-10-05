import {Injectable, PipeTransform} from "@nestjs/common";
import moment from "moment";
import {AppConstant} from "../constant/app.constant";

@Injectable()
export class DateConvertorPipes implements PipeTransform {
    transform(value: any) {
        if (value) {
            let momentValue = moment(value, AppConstant.SUBMIT_TIME_FORMAT);
            if (momentValue.isValid())
                return momentValue.toDate();
            return new Date();
        }
        return value;
    }
}