import { Transaction, CATEGORY_COLORS } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface TransactionsTabProps {
  transactions: Transaction[];
}

export default function TransactionsTab({ transactions }: TransactionsTabProps) {
  return (
    <div className="space-y-1 pb-4">
      <h2 className="text-sm font-body text-muted-foreground mb-3">All Transactions</h2>
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
