import {Role} from "../../base/entities/User";

export interface JwtPayload {
    sub: number;
    username: string;
    refreshToken?: string,
    roles?: Role[];
    permissions?: string[];
    groups?: number[];
    accessFiscalYears?: number[];
    accessOrganizationUnits?: number[];
    accessBanks?: number[];
    accessShops?: number[];
}