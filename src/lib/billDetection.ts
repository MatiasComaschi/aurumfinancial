import { Transaction, DetectedBill } from './types';

const KNOWN_MERCHANTS: Record<string, string> = {
  // Streaming
  netflix: 'Streaming', hulu: 'Streaming', 'disney+': 'Streaming', disney: 'Streaming',
  hbo: 'Streaming', spotify: 'Streaming', 'apple music': 'Streaming',
  'youtube premium': 'Streaming', peacock: 'Streaming', paramount: 'Streaming',
  // Utilities
  electric: 'Utilities', power: 'Utilities', water: 'Utilities', gas: 'Utilities',
  'at&t': 'Utilities', att: 'Utilities', verizon: 'Utilities', 't-mobile': 'Utilities',
  tmobile: 'Utilities', comcast: 'Utilities', xfinity: 'Utilities', spectrum: 'Utilities',
  internet: 'Utilities',
  // Insurance
  geico: 'Insurance', 'state farm': 'Insurance', progressive: 'Insurance',
  allstate: 'Insurance', insurance: 'Insurance', usaa: 'Insurance',
  // Subscriptions
  'amazon prime': 'Subscriptions', icloud: 'Subscriptions', 'google one': 'Subscriptions',
  adobe: 'Subscriptions', microsoft: 'Subscriptions', dropbox: 'Subscriptions',
  // Loans/Debt
  payment: 'Loans & Debt', loan: 'Loans & Debt', minimum: 'Loans & Debt',
  'credit card': 'Loans & Debt',
  // Housing
  rent: 'Rent & Housing', mortgage: 'Rent & Housing', lease: 'Rent & Housing',
  property: 'Rent & Housing',
};

function matchKnownMerchant(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, category] of Object.entries(KNOWN_MERCHANTS)) {
    if (lower.includes(keyword)) return category;
  }
  return null;
}

interface MerchantGroup {
  merchant: string;
  transactions: Transaction[];
}

function groupByMerchant(transactions: Transaction[]): MerchantGroup[] {
  const map: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue; // only expenses
    const key = t.merchant.toLowerCase().trim();
    if (!map[key]) map[key] = [];
    map[key].push(t);
  }
  return Object.entries(map).map(([merchant, txs]) => ({
    merchant: txs[0].merchant, // preserve original casing
    transactions: txs.sort((a, b) => b.date.localeCompare(a.date)),
  }));
}

function hasConsistentAmount(txs: Transaction[]): boolean {
  if (txs.length < 2) return false;
  const amounts = txs.map(t => Math.abs(t.amount));
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  return amounts.every(a => Math.abs(a - avg) / avg <= 0.10);
}

function hasRecurringPattern(txs: Transaction[]): boolean {
  return txs.length >= 2;
}

function estimateNextDate(txs: Transaction[]): string {
  if (txs.length < 2) {
    // Add ~30 days to the last charge
    const d = new Date(txs[0].date);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }
  const dates = txs.map(t => new Date(t.date).getTime()).sort((a, b) => b - a);
  const avgGap = (dates[0] - dates[dates.length - 1]) / (dates.length - 1);
  const next = new Date(dates[0] + avgGap);
  return next.toISOString().split('T')[0];
}

export function detectBills(
  allTransactions: Transaction[], // full 60 days
  billOverrides: Record<string, boolean>, // merchant -> is_bill
): DetectedBill[] {
  const groups = groupByMerchant(allTransactions);
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

  const bills: DetectedBill[] = [];

  for (const group of groups) {
    const merchantLower = group.merchant.toLowerCase().trim();

    // Check user override
    if (billOverrides[merchantLower] === false) continue; // user said NOT a bill
    const isUserOverride = billOverrides[merchantLower] === true;

    const signals: string[] = [];

    // Signal 1: Recurring pattern
    if (hasRecurringPattern(group.transactions)) signals.push('recurring');

    // Signal 2: Known merchant
    const knownCat = matchKnownMerchant(group.merchant);
    if (knownCat) signals.push('known_merchant');

    // Signal 3: Consistent amount
    if (hasConsistentAmount(group.transactions)) signals.push('consistent_amount');

    // Need at least 2 signals, or user override
    if (!isUserOverride && signals.length < 2) continue;

    const latestTx = group.transactions[0];
    const amount = Math.abs(latestTx.amount);

    // Check if paid this month
    const paidThisMonth = group.transactions.some(t => t.date >= thisMonthStart);

    // Amount change vs last month
    const thisMonthTxs = group.transactions.filter(t => t.date >= thisMonthStart);
    const lastMonthTxs = group.transactions.filter(t => t.date >= lastMonthStart && t.date < thisMonthStart);
    let amountChange: number | null = null;
    if (thisMonthTxs.length > 0 && lastMonthTxs.length > 0) {
      amountChange = Math.abs(thisMonthTxs[0].amount) - Math.abs(lastMonthTxs[0].amount);
    }

    bills.push({
      merchant: group.merchant,
      category: knownCat || 'Other',
      amount,
      lastChargeDate: latestTx.date,
      expectedNextDate: estimateNextDate(group.transactions),
      paidThisMonth,
      amountChange,
      signals: isUserOverride ? ['user_marked', ...signals] : signals,
      isUserOverride,
    });
  }

  return bills.sort((a, b) => b.amount - a.amount);
}
