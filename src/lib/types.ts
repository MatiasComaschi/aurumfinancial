export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: CategoryType;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  current_balance: number | null;
  available_balance: number | null;
  institution_name: string;
  plaid_item_id: string; // our DB uuid
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  linked_account_id: string | null;
  created_at: string;
  updated_at: string;
  target_date: string | null;
}

export interface DetectedBill {
  merchant: string;
  category: string;
  amount: number;
  lastChargeDate: string;
  expectedNextDate: string;
  paidThisMonth: boolean;
  amountChange: number | null; // positive = increased
  signals: string[];
  isUserOverride: boolean;
}

export type CategoryType =
  | 'Income'
  | 'Housing'
  | 'Groceries'
  | 'Subscriptions'
  | 'Shopping'
  | 'Dining'
  | 'Transportation'
  | 'Health'
  | 'Debt'
  | 'Utilities'
  | 'Insurance'
  | 'Savings'
  | 'Misc';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CATEGORY_COLORS: Record<CategoryType, string> = {
  Income: '#4ade80',
  Housing: '#fb923c',
  Groceries: '#a78bfa',
  Subscriptions: '#38bdf8',
  Shopping: '#f472b6',
  Dining: '#fbbf24',
  Transportation: '#94a3b8',
  Health: '#34d399',
  Debt: '#f87171',
  Utilities: '#60a5fa',
  Insurance: '#c084fc',
  Savings: '#4ade80',
  Misc: '#9ca3af',
};
