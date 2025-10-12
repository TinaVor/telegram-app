type UserId = number;

type User = {
  id: UserId;
  telegram_id: string;
  first_name: string;
  last_name: string;
  username: string;
};
type UserTableDb = User[];

////////////////////////////////////////////////////////////

type SubscriptionId = string;
type Subscription = {
  id: SubscriptionId;
  user_id: UserId;
  status: 'active' | 'not_active' | 'rejected';
  subscription_expired_date?: string; // Дата в формате UTC
};
type SubscriptionTable = Subscription[];

////////////////////////////////////////////////////////////

type OzonPersonalAccountId = string;
type OzonPersonalAccount = {
  id: OzonPersonalAccountId;
  user_id: UserId;
  client_id: string;
  api_key: string;
};

type OzonPersonalAccountDb = OzonPersonalAccount[];

////////////////////////////////////////////////////////////

type OzonSupplyId = string;
type OzonSupplySlot = {
  dateFrom: string;
  dateTo: string;
};
type OzonSupply = {
  id: OzonSupplyId;
  ozon_personal_account_id: OzonPersonalAccountId;
  slot: OzonSupplySlot;
  supply_number: string;
  cluster_name: string;
  stock_name: string;
  convenient_slot: OzonSupplySlot[];
};
