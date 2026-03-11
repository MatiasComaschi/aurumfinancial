import { Transaction, Goal } from './types';

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2026-03-01', merchant: 'Acme Corp', amount: 4200, category: 'Income' },
  { id: '2', date: '2026-03-01', merchant: 'Landlord Properties', amount: -1450, category: 'Housing' },
  { id: '3', date: '2026-03-02', merchant: 'Whole Foods', amount: -87.32, category: 'Groceries' },
  { id: '4', date: '2026-03-03', merchant: 'Netflix', amount: -15.99, category: 'Subscriptions' },
  { id: '5', date: '2026-03-03', merchant: 'Spotify', amount: -10.99, category: 'Subscriptions' },
  { id: '6', date: '2026-03-04', merchant: 'Amazon', amount: -134.50, category: 'Shopping' },
  { id: '7', date: '2026-03-05', merchant: 'Chipotle', amount: -14.25, category: 'Dining' },
  { id: '8', date: '2026-03-06', merchant: 'Shell Gas', amount: -52.40, category: 'Transportation' },
  { id: '9', date: '2026-03-07', merchant: 'Trader Joes', amount: -62.18, category: 'Groceries' },
  { id: '10', date: '2026-03-08', merchant: 'Uber Eats', amount: -38.90, category: 'Dining' },
  { id: '11', date: '2026-03-09', merchant: 'CVS Pharmacy', amount: -23.45, category: 'Health' },
  { id: '12', date: '2026-03-10', merchant: 'Chase Credit Card', amount: -250, category: 'Debt' },
  { id: '13', date: '2026-03-10', merchant: 'Electric Company', amount: -89.00, category: 'Utilities' },
  { id: '14', date: '2026-03-11', merchant: 'Target', amount: -67.30, category: 'Shopping' },
  { id: '15', date: '2026-03-11', merchant: 'Starbucks', amount: -6.75, category: 'Dining' },
  { id: '16', date: '2026-03-12', merchant: 'Adobe Creative Cloud', amount: -54.99, category: 'Subscriptions' },
  { id: '17', date: '2026-03-13', merchant: 'Freelance Payment', amount: 800, category: 'Income' },
  { id: '18', date: '2026-03-14', merchant: 'Geico Insurance', amount: -145, category: 'Insurance' },
  { id: '19', date: '2026-03-15', merchant: 'Vanguard Transfer', amount: -500, category: 'Savings' },
  { id: '20', date: '2026-03-15', merchant: 'DoorDash', amount: -29.50, category: 'Dining' },
];

export const mockGoals: Goal[] = [
  { id: '1', name: 'Emergency Fund', target: 10000, current: 6200 },
  { id: '2', name: 'Vacation to Japan', target: 5000, current: 1800 },
  { id: '3', name: 'New Laptop', target: 2000, current: 950 },
];
