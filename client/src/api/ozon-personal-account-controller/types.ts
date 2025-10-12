export type OzonPersonalAccount = {
  id: number;
  user_id: number;
  client_id: string;
  api_key: string;
};

export type CreateAccountRequest = {
  client_id: string;
  api_key: string;
};

export type CreateAccountResponse = {
  message: string;
  account: OzonPersonalAccount;
};

export type ListAccountsResponse = OzonPersonalAccount[];

export type DeleteAccountResponse = {
  message: string;
};
