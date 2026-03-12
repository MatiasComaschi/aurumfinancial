import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useBillOverrides() {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const fetchOverrides = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bill_overrides')
        .select('merchant_name, is_bill')
        .eq('user_id', user.id);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const row of data || []) {
        map[row.merchant_name.toLowerCase().trim()] = row.is_bill;
      }
      setOverrides(map);
    } catch (err) {
      console.error('Failed to fetch bill overrides:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const toggleBillOverride = async (merchantName: string, isBill: boolean) => {
    if (!user) return;
    const key = merchantName.toLowerCase().trim();
    try {
      const { error } = await supabase
        .from('bill_overrides')
        .upsert({
          user_id: user.id,
          merchant_name: key,
          is_bill: isBill,
        }, { onConflict: 'user_id,merchant_name' });
      if (error) throw error;
      setOverrides(prev => ({ ...prev, [key]: isBill }));
      toast.success(isBill ? `Marked "${merchantName}" as a bill` : `Removed "${merchantName}" from bills`);
    } catch (err: any) {
      toast.error('Failed to update: ' + (err.message || 'Unknown error'));
    }
  };

  return { overrides, toggleBillOverride };
}
