import { CoreEntity } from "../../base/entities/CoreEntity";
import { Column, Entity } from "typeorm";

export enum SmsTransactionType {
    Deposite = 'Deposite',
    WithDraw = 'WithDraw'
}

@Entity({ name: '_sms_transaction' })
export class SmsTransaction extends CoreEntity {
    @Column({ name: 'amount', type: 'decimal' })
    amount: number;

    @Column({ name: 'current_amount', type: 'decimal' })
    currentAmount: number;

    @Column({ name: 'is_success', type: 'boolean' })
    isSuccess?: boolean;

    @Column({ name: 'type', type: 'varchar' })
    type: SmsTransactionType;

    @Column({ name: 'dest_number', nullable: true })
    destNumber?: string

    @Column({ name: 'content', nullable: true })
    content?: string;
}