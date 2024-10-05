export interface SaleItemDto {
    id: number;
    quantity: number;
    discount?: number;
    manualPrice?: boolean;
    price?: number;
    orgUnit?: number;
    submitAt: Date;
    contractor?: number
    start?: string;
    end?: string;
    credit?: number;
    priceId?: number;
    isTransfer?: boolean
}