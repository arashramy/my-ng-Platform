export interface ExportColumn {
    name?: string;
    type?: any;
    totalsRowFunction?: any;
    totalsRowLabel?: string;
    transform?: string;
}

export interface ExportRequestDto {
    name?: string;
    prefix:string;
    theme?: any;
    columns: ExportColumn[];
}