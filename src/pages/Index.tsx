import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlaidTransactions } from '@/hooks/usePlaidTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBillOverrides } from '@/hooks/useBillOverrides';
import { detectBills } from '@/lib/billDetection';
import TabBar from '@/components/TabBar';
import OverviewTab from '@/components/OverviewTab';
import TransactionsTab from '@/components/TransactionsTab';
import AdviceTab from '@/components/AdviceTab';
import AskTab from '@/components/AskTab';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import GoalsModal from '@/components/GoalsModal';
import { analyzeFinances, chatWithAdvisor, parseAdviceSections } from '@/lib/ai';
import { ChatMessage } from '@/lib/types';

type TabId = 'overview' | 'transactions' | 'advice' | 'ask';

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

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  const [adviceSections, setAdviceSections] = useState<{ emoji: string; title: string; content: string }[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Detect bills from full 60 days
  const bills = useMemo(
    () => detectBills(allTransactions, overrides),
    [allTransactions, overrides]
  );

  // Average monthly savings rate from transaction history
  const avgMonthlySavings = useMemo(() => {
    if (allTransactions.length === 0) return 0;
    const income = allTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spent = Math.abs(allTransactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    const net = income - spent;
    // Normalize to monthly (data is ~60 days)
    const dates = allTransactions.map(t => new Date(t.date).getTime());
    const daySpan = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24));
    return Math.max(0, (net / daySpan) * 30);
  }, [allTransactions]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Send full 60 days to AI
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
      const reply = await chatWithAdvisor(allTransactions, goals, chatMessages, message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to get response');
    } finally {
      setIsChatLoading(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] px-4 pt-6 pb-20">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading text-primary">Aurum</h1>
            <p className="text-xs font-body text-muted-foreground">Hey {displayName} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            <PlaidLinkButton onSuccess={handlePlaidSuccess} />
            <button
              onClick={signOut}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={plaidTransactions}
            isLoading={isLoadingTransactions}
            error={transactionError}
          />
        )}
        {activeTab === 'advice' && <AdviceTab sections={adviceSections} isLoading={isAnalyzing} />}
        {activeTab === 'ask' && (
          <AskTab messages={chatMessages} onSend={handleChatSend} isLoading={isChatLoading} />
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
