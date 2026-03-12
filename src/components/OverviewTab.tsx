import { Transaction, Goal, CATEGORY_COLORS, CategoryType } from '@/lib/types';
import { Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface OverviewTabProps {
  transactions: Transaction[];
  goals: Goal[];
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onRefresh: () => void;
  isLoadingTransactions: boolean;
  transactionError: string | null;
  hasLinkedAccount: boolean;
}

export default function OverviewTab({
  transactions,
  goals,
  onAnalyze,
  isAnalyzing,
  onRefresh,
  isLoadingTransactions,
  transactionError,
  hasLinkedAccount,
}: OverviewTabProps) {
  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const net = income - spent;

  const categoryTotals: Partial<Record<CategoryType, number>> = {};
  transactions.filter(t => t.amount < 0).forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount);
  });
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const maxCatAmount = sortedCategories[0]?.[1] || 1;

  return (
    <div className="space-y-6 pb-4">
      {/* Loading state */}
      {isLoadingTransactions && (
        <div className="flex items-center gap-2 bg-card rounded-lg p-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading transactions...
        </div>
      )}

      {/* Error state */}
      {transactionError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-heading">Failed to load transactions</p>
            <p className="text-xs mt-1 opacity-80">{transactionError}</p>
            <button
              onClick={onRefresh}
              className="text-xs mt-2 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Income" value={income} color="text-income" />
        <StatCard label="Spent" value={spent} color="text-destructive" />
        <StatCard label="Net" value={net} color="text-primary" />
      </div>

      {/* Refresh button */}
      {hasLinkedAccount && (
        <button
          onClick={onRefresh}
          disabled={isLoadingTransactions}
          className="flex items-center gap-2 text-sm font-body text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
          Refresh Transactions
        </button>
      )}

      {/* Goals */}
      <section>
        <h2 className="text-sm font-body text-muted-foreground mb-3">Goal Progress</h2>
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div key={goal.id} className="bg-card rounded-lg p-3">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-body text-foreground">{goal.name}</span>
                  <span className="text-xs font-heading text-primary">
                    ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Spending Categories */}
      {sortedCategories.length > 0 && (
        <section>
          <h2 className="text-sm font-body text-muted-foreground mb-3">Top Spending</h2>
          <div className="space-y-2">
            {sortedCategories.map(([cat, amount]) => (
              <div key={cat} className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat as CategoryType] }}
                />
                <span className="text-sm font-body text-foreground flex-1">{cat}</span>
                <div className="flex-1 max-w-[120px]">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(amount / maxCatAmount) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[cat as CategoryType],
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-heading text-muted-foreground w-16 text-right">
                  ${amount.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing || transactions.length === 0}
        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-heading text-lg flex items-center justify-center gap-2 animate-pulse-gold disabled:opacity-60 disabled:animate-none transition-all"
      >
        {isAnalyzing ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Analyze My Finances
          </>
        )}
      </button>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-lg p-3 text-center">
      <p className="text-xs font-body text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-heading ${color}`}>
        ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
    </div>
  );
}
