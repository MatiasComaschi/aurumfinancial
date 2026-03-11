export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: CategoryType;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
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
