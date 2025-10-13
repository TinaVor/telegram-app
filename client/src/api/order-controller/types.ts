export type OrderSlot = {
  dateFrom: string;
  dateTo: string;
};

export type Order = {
  id: string;
  orderId: string;
  orderNumber: string;
  slot?: OrderSlot;
  clusterName: string;
  stockName: string;
  convenientSlot: OrderSlot[];
  isSlotFixed?: boolean;
};

export type GetSuppliesResponse = Order[];
export type GetSuppliesRequest = {};

export type BookSlotRequest = {
  orderId: string;
  slots: OrderSlot[];
};
export type BookSlotResponse = {};
