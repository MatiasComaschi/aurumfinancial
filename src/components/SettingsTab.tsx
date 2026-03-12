import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PlaidAccount } from '@/lib/types';
import { toast } from 'sonner';
import { Building2, Unlink, Loader2, LogOut, Eye, EyeOff } from 'lucide-react';
import PlaidLinkButton from './PlaidLinkButton';

interface LinkedBank {
  id: string;
  institution_name: string | null;
  created_at: string;
}

interface SettingsTabProps {
  accounts: PlaidAccount[];
  onPlaidSuccess: (publicToken: string, metadata: any) => void;
  onSignOut: () => void;
  onRefreshTransactions: () => void;
  hiddenAccountIds: Set<string>;
  onToggleAccountVisibility: (accountId: string) => void;
}

export default function SettingsTab({
  accounts,
  onPlaidSuccess,
  onSignOut,
  onRefreshTransactions,
  hiddenAccountIds,
  onToggleAccountVisibility,
}: SettingsTabProps) {
  const { user } = useAuth();
  const [linkedBanks, setLinkedBanks] = useState<LinkedBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const fetchLinkedBanks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('plaid_items_safe')
        .select('id, institution_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setLinkedBanks(data || []);
    } catch (err) {
      console.error('Failed to fetch linked banks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLinkedBanks(); }, [user]);

  const handleUnlink = async (bank: LinkedBank) => {
    if (!confirm(`Unlink ${bank.institution_name || 'this bank'}? This will remove all associated transaction data.`)) return;
    setUnlinkingId(bank.id);
    try {
      const { data, error } = await supabase.functions.invoke('unlink-bank', {
        body: { plaid_item_id: bank.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${bank.institution_name || 'Bank'} unlinked`);
      fetchLinkedBanks();
      onRefreshTransactions();
    } catch (err: any) {
      toast.error('Failed to unlink bank. Please try again.');
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Linked Banks */}
      <section>
        <h2 className="text-sm font-body text-muted-foreground flex items-center gap-1.5 mb-3">
          <Building2 className="w-3.5 h-3.5" />
          Linked Banks
        </h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : linkedBanks.length === 0 ? (
          <div className="bg-card rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">No banks linked yet.</p>
            <PlaidLinkButton onSuccess={(pt, meta) => { onPlaidSuccess(pt, meta); fetchLinkedBanks(); }} />
          </div>
        ) : (
          <div className="space-y-2">
            {linkedBanks.map(bank => (
              <div key={bank.id} className="bg-card rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-foreground">{bank.institution_name || 'Unknown Bank'}</p>
                  <p className="text-xs text-muted-foreground">
                    Linked {new Date(bank.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleUnlink(bank)}
                  disabled={unlinkingId === bank.id}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                >
                  {unlinkingId === bank.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5" />
                  )}
                  Unlink
                </button>
              </div>
            ))}
            <div className="pt-2">
              <PlaidLinkButton onSuccess={(pt, meta) => { onPlaidSuccess(pt, meta); fetchLinkedBanks(); }} />
            </div>
          </div>
        )}
      </section>

      {/* Account Visibility */}
      {accounts.length > 0 && (
        <section>
          <h2 className="text-sm font-body text-muted-foreground flex items-center gap-1.5 mb-3">
            <Eye className="w-3.5 h-3.5" />
            Account Visibility
          </h2>
          <p className="text-xs text-muted-foreground mb-2">
            Toggle which accounts appear on the Overview tab.
          </p>
          <div className="space-y-2">
            {accounts.map(acct => {
              const isHidden = hiddenAccountIds.has(acct.account_id);
              return (
                <div key={acct.account_id} className="bg-card rounded-lg p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className={`text-sm font-body ${isHidden ? 'text-muted-foreground' : 'text-foreground'}`}>{acct.name}</p>
                    <p className="text-xs text-muted-foreground">{acct.institution_name}</p>
                  </div>
                  <button
                    onClick={() => onToggleAccountVisibility(acct.account_id)}
                    className={`p-2 transition-colors ${isHidden ? 'text-muted-foreground hover:text-foreground' : 'text-primary hover:text-primary/80'}`}
                    title={isHidden ? 'Show account' : 'Hide account'}
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sign Out */}
      <section>
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 bg-card rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </section>
    </div>
  );
}
