import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Goal, PlaidAccount } from '@/lib/types';
import { toast } from 'sonner';

export function useGoals(accounts: PlaidAccount[]) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Update goals with linked account balances
      const updated = (data || []).map((g: any) => {
        if (g.linked_account_id && accounts.length > 0) {
          const linkedAcct = accounts.find(a => a.account_id === g.linked_account_id);
          if (linkedAcct && linkedAcct.current_balance !== null) {
            return { ...g, current_amount: Math.max(0, linkedAcct.current_balance) };
          }
        }
        return g;
      }) as Goal[];

      setGoals(updated);
    } catch (err: any) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, accounts]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = async (name: string, targetAmount: number, currentAmount: number, linkedAccountId: string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        name,
        target_amount: targetAmount,
        current_amount: currentAmount,
        linked_account_id: linkedAccountId || null,
      });
      if (error) throw error;
      toast.success('Goal created!');
      await fetchGoals();
    } catch (err: any) {
      toast.error('Failed to create goal: ' + (err.message || 'Unknown error'));
    }
  };

  const updateGoal = async (id: string, updates: Partial<Pick<Goal, 'name' | 'target_amount' | 'current_amount' | 'linked_account_id'>>) => {
    try {
      const { error } = await supabase.from('goals').update(updates).eq('id', id);
      if (error) throw error;
      toast.success('Goal updated!');
      await fetchGoals();
    } catch (err: any) {
      toast.error('Failed to update goal: ' + (err.message || 'Unknown error'));
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      toast.success('Goal deleted');
      await fetchGoals();
    } catch (err: any) {
      toast.error('Failed to delete goal: ' + (err.message || 'Unknown error'));
    }
  };

  return { goals, isLoading, addGoal, updateGoal, deleteGoal, refetchGoals: fetchGoals };
}
