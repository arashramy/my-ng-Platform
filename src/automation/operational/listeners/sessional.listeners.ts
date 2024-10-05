import {Injectable} from "@nestjs/common";
import {EventEmitter2, OnEvent} from "@nestjs/event-emitter";
import {EventsConstant} from "../../../common/constant/events.constant";
import {SettingService} from "../../../common/service/setting.service";
import {SaleItem} from "../entities/SaleItem";

@Injectable()
export class SessionalListeners {

    constructor(private eventEmitter: EventEmitter2, private settingService: SettingService) {
    }

    @OnEvent(EventsConstant.SERVICE_SESSIONAL_CHANGED)
    async onMessage(saleItem: SaleItem) {
        if (saleItem) {

        }
    }
}