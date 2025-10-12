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
};

export type GetSuppliesResponse = Order[];
export type GetSuppliesRequest = {};
