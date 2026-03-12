import { useState } from 'react';
import { PlaidAccount } from '@/lib/types';
import { Wallet, X } from 'lucide-react';

interface BalanceCardsProps {
  accounts: PlaidAccount[];
}

export default function BalanceCards({ accounts }: BalanceCardsProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const visibleAccounts = accounts.filter(a => !hiddenIds.has(a.account_id));

  if (visibleAccounts.length === 0) return null;

  const total = visibleAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const handleRemove = (accountId: string) => {
    setHiddenIds(prev => new Set(prev).add(accountId));
  };

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-body text-muted-foreground flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5" />
        Account Balances
      </h2>
      <div className="space-y-2">
        {visibleAccounts.map(acct => (
          <div key={acct.account_id} className="bg-card rounded-lg p-3 flex items-center justify-between group">
            <div className="min-w-0">
              <p className="text-sm font-body text-foreground truncate">{acct.name}</p>
              <p className="text-xs text-muted-foreground">{acct.institution_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-heading text-primary flex-shrink-0">
                ${(acct.current_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => handleRemove(acct.account_id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                title="Hide account"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {visibleAccounts.length > 1 && (
          <div className="bg-secondary rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-heading text-foreground">Combined Total</span>
            <span className="text-lg font-heading text-primary">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
