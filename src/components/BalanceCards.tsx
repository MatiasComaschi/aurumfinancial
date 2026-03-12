import { PlaidAccount } from '@/lib/types';
import { Wallet } from 'lucide-react';

interface BalanceCardsProps {
  accounts: PlaidAccount[];
}

export default function BalanceCards({ accounts }: BalanceCardsProps) {
  if (accounts.length === 0) return null;

  const total = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-body text-muted-foreground flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5" />
        Account Balances
      </h2>
      <div className="space-y-2">
        {accounts.map(acct => (
          <div key={acct.account_id} className="bg-card rounded-lg p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-body text-foreground truncate">{acct.name}</p>
              <p className="text-xs text-muted-foreground">{acct.institution_name}</p>
            </div>
            <span className="text-lg font-heading text-primary flex-shrink-0">
              ${(acct.current_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        {accounts.length > 1 && (
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
