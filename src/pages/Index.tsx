import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePlaidTransactions } from '@/hooks/usePlaidTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBillOverrides } from '@/hooks/useBillOverrides';
import { useMemories } from '@/hooks/useMemories';
import { usePreferences } from '@/hooks/usePreferences';
import { detectBills } from '@/lib/billDetection';
import TabBar from '@/components/TabBar';
import OverviewTab from '@/components/OverviewTab';
import TransactionsTab from '@/components/TransactionsTab';
import AdviceTab from '@/components/AdviceTab';
import AskTab from '@/components/AskTab';
import MemoryTab from '@/components/MemoryTab';
import GoalsModal from '@/components/GoalsModal';
import SettingsTab from '@/components/SettingsTab';
import OnboardingFlow from '@/components/OnboardingFlow';
import { analyzeFinances, chatWithAdvisor, extractMemories, parseAdviceSections } from '@/lib/ai';
import { ChatMessage } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

type TabId = 'overview' | 'transactions' | 'advice' | 'ask' | 'memory' | 'settings';

export default function Index() {
  const { user, signOut } = useAuth();
  const {
    plaidTransactions,
    allTransactions,
    accounts,
    isLoadingTransactions,
    transactionError,
    hasLinkedAccount,
    fetchTransactions,
    handlePlaidSuccess,
  } = usePlaidTransactions();

  const { goals, addGoal, updateGoal, deleteGoal } = useGoals(accounts);
  const { overrides, toggleBillOverride } = useBillOverrides();
  const { memories, isLoading: isLoadingMemories, addMemory, deleteMemory, fetchMemories, buildMemoryBlock } = useMemories();
  const { isLoaded: prefsLoaded, getPreference, setPreference } = usePreferences();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  const [adviceSections, setAdviceSections] = useState<{ emoji: string; title: string; content: string }[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Account visibility from Supabase preferences
  const hiddenAccountIds = useMemo(() => {
    const raw = getPreference('hidden_accounts', '[]');
    try {
      return new Set<string>(JSON.parse(raw));
    } catch {
      return new Set<string>();
    }
  }, [getPreference]);

  const toggleAccountVisibility = useCallback((accountId: string) => {
    const newSet = new Set(hiddenAccountIds);
    if (newSet.has(accountId)) {
      newSet.delete(accountId);
    } else {
      newSet.add(accountId);
    }
    setPreference('hidden_accounts', JSON.stringify([...newSet]));
  }, [hiddenAccountIds, setPreference]);

  // Onboarding state
  const onboardingComplete = getPreference('onboarding_complete', 'false') === 'true';
  const onboardingStep = parseInt(getPreference('onboarding_step', '1'), 10);

  const showOnboarding = prefsLoaded && !onboardingComplete && !hasLinkedAccount;

  const handleOnboardingStepChange = (step: number) => {
    setPreference('onboarding_step', String(step));
  };

  const handleOnboardingComplete = () => {
    setPreference('onboarding_complete', 'true');
  };

  const handleOnboardingPlaidSuccess = (publicToken: string, metadata: any) => {
    handlePlaidSuccess(publicToken, metadata);
  };

  const bills = useMemo(
    () => detectBills(allTransactions, overrides),
    [allTransactions, overrides]
  );

  const avgMonthlySavings = useMemo(() => {
    if (allTransactions.length === 0) return 0;
    const income = allTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spent = Math.abs(allTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const net = income - spent;
    const dates = allTransactions.map(t => new Date(t.date).getTime());
    const daySpan = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
    return Math.max(0, (net / daySpan) * 30);
  }, [allTransactions]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(allTransactions, goals);
      setAdviceSections(parseAdviceSections(result));
      setActiveTab('advice');
      toast.success('Analysis complete!');
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSend = async (message: string) => {
    const newUserMsg: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsChatLoading(true);
    try {
      const memoryBlock = buildMemoryBlock();
      const reply = await chatWithAdvisor(allTransactions, goals, chatMessages, message, memoryBlock);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (user) {
        extractMemories(message).then(async (extracted) => {
          if (extracted.length > 0) {
            for (const m of extracted) {
              await supabase.from('user_memory').insert({
                user_id: user.id,
                memory_type: m.memory_type,
                content: m.content,
                context_date: m.context_date || new Date().toISOString(),
              });
            }
            fetchMemories();
          }
        });
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to get response');
    } finally {
      setIsChatLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  // Don't render until preferences are loaded to avoid flicker
  if (!prefsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding for new users without a linked bank
  if (showOnboarding) {
    return (
      <OnboardingFlow
        currentStep={onboardingStep}
        onPlaidSuccess={handleOnboardingPlaidSuccess}
        onComplete={handleOnboardingComplete}
        onStepChange={handleOnboardingStepChange}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] px-4 pt-6 pb-20">
        <header className="mb-6">
          <h1 className="text-2xl font-heading text-primary">Aurum</h1>
          <p className="text-xs font-body text-muted-foreground">Hey {displayName} 👋</p>
        </header>

        {activeTab === 'overview' && (
          <OverviewTab
            transactions={plaidTransactions}
            goals={goals}
            accounts={accounts}
            bills={bills}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            onRefresh={fetchTransactions}
            isLoadingTransactions={isLoadingTransactions}
            transactionError={transactionError}
            hasLinkedAccount={hasLinkedAccount}
            onManageGoals={() => setGoalsModalOpen(true)}
            onToggleBill={toggleBillOverride}
            avgMonthlySavings={avgMonthlySavings}
            hiddenAccountIds={hiddenAccountIds}
            onHideAccount={toggleAccountVisibility}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={plaidTransactions}
            isLoading={isLoadingTransactions}
            error={transactionError}
            onMarkAsBill={(merchant) => toggleBillOverride(merchant, true)}
          />
        )}
        {activeTab === 'advice' && <AdviceTab sections={adviceSections} isLoading={isAnalyzing} />}
        {activeTab === 'ask' && (
          <AskTab messages={chatMessages} onSend={handleChatSend} isLoading={isChatLoading} />
        )}
        {activeTab === 'memory' && (
          <MemoryTab
            memories={memories}
            isLoading={isLoadingMemories}
            onAdd={addMemory}
            onDelete={deleteMemory}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            accounts={accounts}
            onPlaidSuccess={handlePlaidSuccess}
            onSignOut={signOut}
            onRefreshTransactions={() => fetchTransactions(true)}
            hiddenAccountIds={hiddenAccountIds}
            onToggleAccountVisibility={toggleAccountVisibility}
          />
        )}

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <GoalsModal
          open={goalsModalOpen}
          onClose={() => setGoalsModalOpen(false)}
          goals={goals}
          accounts={accounts}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onDelete={deleteGoal}
        />
      </div>
    </div>
  );
}
