import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import TabBar from '@/components/TabBar';
import OverviewTab from '@/components/OverviewTab';
import TransactionsTab from '@/components/TransactionsTab';
import AdviceTab from '@/components/AdviceTab';
import AskTab from '@/components/AskTab';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import { mockTransactions, mockGoals } from '@/lib/mockData';
import { analyzeFinances, chatWithAdvisor, parseAdviceSections } from '@/lib/ai';
import { Transaction, Goal, ChatMessage } from '@/lib/types';

type TabId = 'overview' | 'transactions' | 'advice' | 'ask';

export default function Index() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [goals] = useState<Goal[]>(mockGoals);

  const [adviceSections, setAdviceSections] = useState<{ emoji: string; title: string; content: string }[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(transactions, goals);
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
      const reply = await chatWithAdvisor(transactions, goals, chatMessages, message);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to get response');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePlaidSuccess = (plaidTransactions: any[]) => {
    // Map Plaid transactions to our format
    const mapped: Transaction[] = plaidTransactions.map((t: any, i: number) => ({
      id: `plaid-${i}-${t.transaction_id || Date.now()}`,
      date: t.date || new Date().toISOString().split('T')[0],
      merchant: t.merchant_name || t.name || 'Unknown',
      amount: -(t.amount || 0), // Plaid uses positive for debits
      category: mapPlaidCategory(t.personal_finance_category?.primary || t.category?.[0] || 'OTHER'),
    }));
    setTransactions(prev => [...mapped, ...prev]);
    toast.success(`Imported ${mapped.length} transactions`);
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
            transactions={transactions}
            goals={goals}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        )}
        {activeTab === 'transactions' && <TransactionsTab transactions={transactions} />}
        {activeTab === 'advice' && <AdviceTab sections={adviceSections} isLoading={isAnalyzing} />}
        {activeTab === 'ask' && (
          <AskTab messages={chatMessages} onSend={handleChatSend} isLoading={isChatLoading} />
        )}

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
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
