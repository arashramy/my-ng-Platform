import {Transform} from "class-transformer";

export class ReceptionChartReportDto {
    @Transform(params => params?.value ? +params.value : 0)
    id: number;
    title: string;
    @Transform(params => params?.value ? +params.value : 0)
    data: number;
}