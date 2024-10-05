import {Transform} from "class-transformer";

export class ContractorIncomeServiceReportDto {
    @Transform(params => params?.value ? +params.value : 0)
    id?: number;
    title?: string;
    @Transform(params => params?.value ? +params.value : 0)
    qty?:number;
    @Transform(params => params?.value ? +params.value : 0)
    discount?:number;
    @Transform(params => params?.value ? +params.value : 0)
    totalAmount?:number;
    @Transform(params => params?.value ? +params.value : 0)
    contractorIncome?: number;
    @Transform(params => params?.value ? +params.value : 0)
    contractorIncomeAfterDiscount?: number
}