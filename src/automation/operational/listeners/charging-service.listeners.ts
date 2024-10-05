import {Injectable} from "@nestjs/common";
import {EventEmitter2, OnEvent} from "@nestjs/event-emitter";
import {EventsConstant} from "../../../common/constant/events.constant";
import {SettingService} from "../../../common/service/setting.service";
import {Transaction} from "../entities/Transaction";

@Injectable()
export class ChargingServiceListeners {

    constructor(private eventEmitter: EventEmitter2, private settingService: SettingService) {
    }

    @OnEvent(EventsConstant.TRANSACTION_SETTLE_CHARGING_SERVICE)
    async onMessage(payload: [Transaction, number]) {
        if (payload?.length == 2) {

        }
    }

    @OnEvent(EventsConstant.TRANSACTION_REMOVE_CHARGING_SERVICE)
    async onRemoveMessage(transaction: Transaction) {
        if (transaction) {

        }
    }
}