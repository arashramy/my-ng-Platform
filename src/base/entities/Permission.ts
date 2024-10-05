import {BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn,} from "typeorm";
import {jsonTransformer} from "../../common/typeorm/converter/json-transformer";
import {PermissionAction} from "../../common/constant/auth.constant";

@Entity({name: '_permissions'})
export class Permission extends BaseEntity {

    @PrimaryColumn({name: 'work_group'})
    group?: number;
    @PrimaryColumn({name: 'action_key', default: "*"})
    key: string;
    @Column('text', {name: 'actions', default: "[]", transformer: jsonTransformer})
    actions: PermissionAction[];

    @UpdateDateColumn({name: 'updated_at'})
    updatedAt?: Date;

    @CreateDateColumn({name: 'created_at'})
    createdAt?: Date;
}
