import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Transaction } from '@/lib/types';
import { toast } from 'sonner';

function mapPlaidTransaction(t: any, i: number): Transaction {
  const amount = -(t.amount || 0); // Plaid: positive = debit, we flip
  return {
    id: `plaid-${t.transaction_id || i}-${t.date}`,
    date: t.date || new Date().toISOString().split('T')[0],
    merchant: t.merchant_name || t.name || 'Unknown',
    amount,
    category: mapPlaidCategory(t.personal_finance_category?.primary || t.category?.[0] || 'OTHER'),
  };
}

function mapPlaidCategory(plaidCategory: string): Transaction['category'] {
  const map: Record<string, Transaction['category']> = {
    INCOME: 'Income',
    TRANSFER_IN: 'Income',
    RENT: 'Housing',
    MORTGAGE: 'Housing',
    FOOD_AND_DRINK: 'Dining',
    GROCERIES: 'Groceries',
    ENTERTAINMENT: 'Subscriptions',
    SHOPPING: 'Shopping',
    TRANSPORTATION: 'Transportation',
    MEDICAL: 'Health',
    LOAN_PAYMENTS: 'Debt',
    UTILITIES: 'Utilities',
    INSURANCE: 'Insurance',
    SAVINGS: 'Savings',
  };
  return map[plaidCategory] || 'Misc';
}

export function usePlaidTransactions() {
  const { user } = useAuth();
  const [plaidTransactions, setPlaidTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoadingTransactions(true);
    setTransactionError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-transactions');
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const mapped = (data.transactions || []).map(mapPlaidTransaction);
      setPlaidTransactions(mapped);
      setHasLinkedAccount(true);

      if (data.errors?.length) {
        toast.warning(`Some accounts had issues: ${data.errors.join(', ')}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch transactions';
      setTransactionError(msg);
      console.error('fetch-transactions error:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user]);

  // Check for linked accounts on mount
  useEffect(() => {
    if (!user) return;
    const checkAndFetch = async () => {
      const { data, error } = await supabase
        .from('plaid_items')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!error && data && data.length > 0) {
        setHasLinkedAccount(true);
        fetchTransactions();
      }
    };
    checkAndFetch();
  }, [user, fetchTransactions]);

  const handlePlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: {
          public_token: publicToken,
          institution: metadata.institution,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`${metadata.institution?.name || 'Bank'} linked successfully!`);

      const mapped = (data.transactions || []).map(mapPlaidTransaction);
      if (mapped.length > 0) {
        setPlaidTransactions(mapped);
      } else if (data.transactions_error) {
        toast.info('Transactions may take a moment to become available. Try refreshing shortly.');
        // Auto-retry after a delay
        setTimeout(() => fetchTransactions(), 5000);
      }
      setHasLinkedAccount(true);
    } catch (err: any) {
      toast.error('Failed to link account: ' + (err.message || 'Unknown error'));
    }
  }, [fetchTransactions]);

  return {
    plaidTransactions,
    isLoadingTransactions,
    transactionError,
    hasLinkedAccount,
    fetchTransactions,
    handlePlaidSuccess,
  };
}
