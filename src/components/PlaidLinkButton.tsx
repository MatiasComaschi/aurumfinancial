import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Building2, Link2, Loader2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess: (publicToken: string, metadata: any) => void;
}

export default function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  const createLinkToken = async () => {
    if (!user) return;
    setIsCreatingToken(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-link-token', {
        body: { user_id: user.id },
      });
      if (error) throw error;
      setLinkToken(data.link_token);
    } catch (err: any) {
      toast.error('Failed to initialize Plaid: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreatingToken(false);
    }
  };

  const onPlaidSuccess = useCallback(
    (publicToken: string, metadata: any) => {
      onSuccess(publicToken, metadata);
      setLinkToken(null);
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  });

  if (!linkToken) {
    return (
      <button
        onClick={createLinkToken}
        disabled={isCreatingToken}
        className="flex items-center gap-2 bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm font-body hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        {isCreatingToken ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
        Link Bank Account
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-heading disabled:opacity-50 transition-opacity"
    >
      <Link2 className="w-4 h-4" />
      Connect Your Bank
    </button>
  );
}
