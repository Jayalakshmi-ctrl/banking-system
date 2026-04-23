import type { AccountServiceClient } from "../../infrastructure/clients/account-service.client";
import type { CustomerServiceClient } from "../../infrastructure/clients/customer-service.client";

export type TxnNotificationContact = {
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
};

export interface TxnContactResolver {
  forAccount(accountId: string): Promise<TxnNotificationContact>;
}

export class DefaultTxnContactResolver implements TxnContactResolver {
  constructor(
    private readonly accounts: AccountServiceClient,
    private readonly customers: CustomerServiceClient,
  ) {}

  async forAccount(accountId: string): Promise<TxnNotificationContact> {
    const summary = await this.accounts.getPublicAccountSummary(accountId);
    if (!summary) {
      return {};
    }
    const profile = await this.customers.getCustomerProfile(summary.customerId);
    const base: TxnNotificationContact = { customer_id: summary.customerId };
    if (!profile) {
      return base;
    }
    return {
      ...base,
      customer_email: profile.email,
      customer_phone: profile.phone,
    };
  }
}
