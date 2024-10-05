export interface ShopQueueDto {
  user: number;
  orderType: string;
  id: number;
  items: x[];
  submitAt: Date;
}

export interface x {
  id: number;
  price: number;
  quantity: number;
  discount: number;
}
