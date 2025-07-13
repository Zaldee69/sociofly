// Billing related types

export type BillingPlan = "FREE" | "PRO" | "ENTERPRISE";

export type BillingCycle = "MONTHLY" | "YEARLY";

export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  plan: BillingPlan;
  billingCycle: BillingCycle;
  status: TransactionStatus;
  midtransToken?: string | null;
  midtransOrderId: string;
  paymentDetails?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: {
    name: string | null;
    email: string;
  };
}
