import { useState, useMemo } from 'react';
import { Transaction, CATEGORY_COLORS, CategoryType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Loader2, AlertCircle, Receipt, Search, X, SlidersHorizontal } from 'lucide-react';

const ALL_CATEGORIES: CategoryType[] = [
  'Income', 'Housing', 'Groceries', 'Subscriptions', 'Shopping', 'Dining',
  'Transportation', 'Health', 'Debt', 'Utilities', 'Insurance', 'Savings', 'Misc',
];

interface TransactionsTabProps {
  transactions: Transaction[];
  isLoading?: boolean;
  error?: string | null;
  onMarkAsBill?: (merchant: string) => void;
}

export default function TransactionsTab({ transactions, isLoading, error, onMarkAsBill }: TransactionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const sixtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d.toISOString().split('T')[0];
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      if (searchQuery && !t.merchant.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      // Category
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      // Date range
      if (t.date < startDate || t.date > endDate) return false;
      // Amount
      const absAmount = Math.abs(t.amount);
      if (minAmount && absAmount < parseFloat(minAmount)) return false;
      if (maxAmount && absAmount > parseFloat(maxAmount)) return false;
      return true;
    });
  }, [transactions, searchQuery, selectedCategory, startDate, endDate, minAmount, maxAmount]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'All' || minAmount || maxAmount;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setStartDate(d.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setMinAmount('');
    setMaxAmount('');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <p className="text-sm font-body">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="w-6 h-6 text-destructive mb-3" />
        <p className="text-sm font-heading text-destructive">Failed to load transactions</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[300px] text-center">{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm font-body">No transactions yet. Link a bank account to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by merchant..."
            className="w-full bg-card rounded-lg pl-9 pr-4 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-lg transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="bg-card rounded-lg p-3 space-y-3">
          {/* Category */}
          <div>
            <label className="text-xs text-muted-foreground font-body block mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as CategoryType | 'All')}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground"
            >
              <option value="All">All Categories</option>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">From</label>
              <input
                type="date"
                value={startDate}
                min={sixtyDaysAgo}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground"
              />
            </div>
          </div>

          {/* Amount range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">Min $</label>
              <input
                type="number"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-body block mb-1">Max $</label>
              <input
                type="number"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                placeholder="∞"
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-xs font-body text-muted-foreground">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </p>

      {/* Transaction list */}
      <div className="space-y-1">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm font-body">
            No transactions match your filters.
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="flex items-center gap-3 bg-card rounded-lg p-3">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[t.category] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-foreground truncate">{t.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(t.date), 'MMM d')} · {t.category}
                </p>
              </div>
              <span
                className={`text-sm font-heading flex-shrink-0 ${
                  t.amount > 0 ? 'text-income' : 'text-foreground'
                }`}
              >
                {t.amount > 0 ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
              </span>
              {t.amount < 0 && onMarkAsBill && (
                <button
                  onClick={() => onMarkAsBill(t.merchant)}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  title="Mark as recurring bill"
                >
                  <Receipt className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
