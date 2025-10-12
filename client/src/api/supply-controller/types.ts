export type SupplySlot = {
  dateFrom: string;
  dateTo: string;
};

export type Supply = {
  id: string;
  orderId: string;
  supplyNumber: string;
  slot?: SupplySlot;
  clusterName: string;
  stockName: string;
  convenientSlot: SupplySlot[];
};

export type GetSuppliesResponse = Supply[];
export type GetSuppliesRequest = {};
