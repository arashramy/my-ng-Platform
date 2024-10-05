import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn} from "typeorm";
import {Role, User} from "./User";
import {jsonTransformer} from "../../common/typeorm/converter/json-transformer";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({name: '_dashboard'})
export class Dashboard extends BaseEntity {
    @PrimaryColumn({name: 'work_group', default: 0})
    group?: number = null;
    @PrimaryColumn({name: 'org_unit', default: 0})
    organizationUnit?: number = null;
    @PrimaryColumn({name: '_path', default: Role.Membership})
    path?: string = null;
    @Column('json', {name: 'widgets'})
    widgets?: any;
    @Column({name: 'status', default: true})
    enable?: boolean = true;
    @UpdateDateColumn({name: 'updated_at', type: 'timestamptz'})
    updatedAt?: Date;
    @ManyToOne(() => User)
    @JoinColumn({name: "updated_by", referencedColumnName: "id"})
    updatedBy?: User;
}
