import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, LessThanOrEqual, MoreThan } from "typeorm";
import { GiftType, WalletGift } from "../../base/entities/WalletGift";

@Injectable()
export class WalletGiftService {

    constructor(private ds: DataSource) {
    }

    async get(withoutChequePrice: number, price: number, organizationUnit: number, manager?: EntityManager): Promise<[WalletGift, number]> {
        manager ||= this.ds.manager;
        console.log('salam')

        const gift = await WalletGift.findOne({
            where:
                [{
                    cheque: false,
                    fromPrice: LessThanOrEqual(withoutChequePrice),
                    toPrice: MoreThan(withoutChequePrice),
                    organizationUnits: { id: organizationUnit }
                }, {
                    cheque: true,
                    fromPrice: LessThanOrEqual(price),
                    toPrice: MoreThan(price),
                    organizationUnits: { id: organizationUnit }
                }]

        })

        // let gift = await manager.createQueryBuilder()
        //     .from(WalletGift, 'q')
        //     .leftJoin('q.organizationUnits', 'organizationUnits')
        //     .where(`organizationUnits.id IS NULL OR organizationUnits.id = ${organizationUnit}`)
        //     .andWhere([{
        //         cheque: false,
        //         fromPrice: LessThanOrEqual(withoutChequePrice),
        //         toPrice: MoreThan(withoutChequePrice),
        //     }, {
        //         cheque: true,
        //         fromPrice: LessThanOrEqual(price),
        //         toPrice: MoreThan(price),
        //     }])
        //     .limit(1)
        //     .getOne();
        // console.log('nima ladmakhi', await WalletGift.find({
        //     where: [{
        //         cheque: false,
        //         fromPrice: LessThanOrEqual(withoutChequePrice),
        //         toPrice: MoreThan(withoutChequePrice),
        //         organizationUnits: { id: organizationUnit }
        //     }, {
        //         cheque: true,
        //         fromPrice: LessThanOrEqual(price),
        //         toPrice: MoreThan(price),
        //         organizationUnits: { id: organizationUnit }
        //     }]
        // }))
        if (gift) {
            return [
                gift,
                gift.type == GiftType.percent ? (price * gift.gift) / 100 : gift.gift,
            ];
        }
        return [null, 0];
    }
}
