import { Transaction, CATEGORY_COLORS } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';

interface TransactionsTabProps {
  transactions: Transaction[];
  isLoading?: boolean;
  error?: string | null;
}

export default function TransactionsTab({ transactions, isLoading, error }: TransactionsTabProps) {
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
    <div className="space-y-1 pb-4">
      <h2 className="text-sm font-body text-muted-foreground mb-3">
        All Transactions ({transactions.length})
      </h2>
      {transactions.map(t => (
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
        </div>
      ))}
    </div>
  );
}
