import { useState } from 'react';
import { DetectedBill } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Receipt, Check, Clock, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react';

interface BillsSectionProps {
  bills: DetectedBill[];
  onToggleBill: (merchant: string, isBill: boolean) => void;
}

export default function BillsSection({ bills, onToggleBill }: BillsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (bills.length === 0) return null;

  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);

  // Group by category
  const grouped: Record<string, DetectedBill[]> = {};
  for (const bill of bills) {
    if (!grouped[bill.category]) grouped[bill.category] = [];
    grouped[bill.category].push(bill);
  }

  return (
    <section className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2"
      >
        <h2 className="text-sm font-body text-muted-foreground flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" />
          Bills & Subscriptions
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading text-primary">
            ${totalMonthly.toFixed(2)}/mo
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          {Object.entries(grouped).map(([category, categoryBills]) => (
            <div key={category} className="space-y-1">
              <p className="text-xs font-heading text-muted-foreground uppercase tracking-wider">{category}</p>
              {categoryBills.map(bill => (
                <div key={bill.merchant} className="bg-card rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {bill.paidThisMonth ? (
                        <Check className="w-3.5 h-3.5 text-income flex-shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-body text-foreground truncate">{bill.merchant}</p>
                        <p className="text-xs text-muted-foreground">
                          {bill.paidThisMonth ? 'Paid' : `Due ~${format(parseISO(bill.expectedNextDate), 'MMM d')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className={`text-sm font-heading ${bill.amountChange && bill.amountChange > 0.5 ? 'text-destructive' : 'text-foreground'}`}>
                          ${bill.amount.toFixed(2)}
                        </span>
                        {bill.amountChange !== null && Math.abs(bill.amountChange) > 0.5 && (
                          <p className={`text-xs flex items-center justify-end gap-0.5 ${bill.amountChange > 0 ? 'text-destructive' : 'text-income'}`}>
                            <TrendingUp className="w-3 h-3" />
                            {bill.amountChange > 0 ? '+' : ''}${bill.amountChange.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onToggleBill(bill.merchant, false)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove from bills"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
