import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Transaction, PlaidAccount } from '@/lib/types';
import { toast } from 'sonner';

function mapPlaidTransaction(t: any, i: number): Transaction {
  const amount = -(t.amount || 0);
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
    // Income
    INCOME: 'Income',
    TRANSFER_IN: 'Income',
    // Housing
    RENT_AND_UTILITIES: 'Housing',
    RENT: 'Housing',
    MORTGAGE: 'Housing',
    HOME_IMPROVEMENT: 'Housing',
    // Groceries
    GROCERIES: 'Groceries',
    // Dining
    FOOD_AND_DRINK: 'Dining',
    RESTAURANTS: 'Dining',
    COFFEE: 'Dining',
    // Subscriptions
    ENTERTAINMENT: 'Subscriptions',
    SUBSCRIPTION: 'Subscriptions',
    DIGITAL_PURCHASE: 'Subscriptions',
    // Shopping
    SHOPPING: 'Shopping',
    GENERAL_MERCHANDISE: 'Shopping',
    CLOTHING: 'Shopping',
    ELECTRONICS: 'Shopping',
    PERSONAL_CARE: 'Shopping',
    // Transportation
    TRANSPORTATION: 'Transportation',
    GAS: 'Transportation',
    TRAVEL: 'Transportation',
    TAXI: 'Transportation',
    PARKING: 'Transportation',
    PUBLIC_TRANSIT: 'Transportation',
    // Health
    MEDICAL: 'Health',
    HEALTHCARE: 'Health',
    PHARMACY: 'Health',
    FITNESS: 'Health',
    // Debt
    LOAN_PAYMENTS: 'Debt',
    CREDIT_CARD_PAYMENT: 'Debt',
    BANK_FEES: 'Debt',
    // Utilities
    UTILITIES: 'Utilities',
    TELEPHONE: 'Utilities',
    INTERNET: 'Utilities',
    // Insurance
    INSURANCE: 'Insurance',
    // Savings
    SAVINGS: 'Savings',
    INVESTMENT: 'Savings',
    TRANSFER_OUT: 'Savings',
  };
  return map[plaidCategory] || 'Misc';
}

export function usePlaidTransactions() {
  const { user } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // full 60 days
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);

  // UI transactions = last 30 days only
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const plaidTransactions = allTransactions.filter(t => t.date >= thirtyDaysAgo);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoadingTransactions(true);
    setTransactionError(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-transactions');
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const mapped = (data.transactions || []).map(mapPlaidTransaction);
      setAllTransactions(mapped);
      setAccounts(data.accounts || []);
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
      // Immediately fetch all data
      setTimeout(() => fetchTransactions(), 2000);
      setHasLinkedAccount(true);
    } catch (err: any) {
      toast.error('Failed to link account: ' + (err.message || 'Unknown error'));
    }
  }, [fetchTransactions]);

  return {
    plaidTransactions, // 30 days for UI
    allTransactions, // 60 days for AI/bills
    accounts,
    isLoadingTransactions,
    transactionError,
    hasLinkedAccount,
    fetchTransactions,
    handlePlaidSuccess,
  };
}
