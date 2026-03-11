import { useState } from 'react';
import { toast } from 'sonner';
import TabBar from '@/components/TabBar';
import OverviewTab from '@/components/OverviewTab';
import TransactionsTab from '@/components/TransactionsTab';
import AdviceTab from '@/components/AdviceTab';
import AskTab from '@/components/AskTab';
import { mockTransactions, mockGoals } from '@/lib/mockData';
import { analyzeFinances, chatWithAdvisor, parseAdviceSections } from '@/lib/ai';
import { Transaction, Goal, ChatMessage } from '@/lib/types';

type TabId = 'overview' | 'transactions' | 'advice' | 'ask';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [transactions] = useState<Transaction[]>(mockTransactions);
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

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] px-4 pt-6 pb-20">
        <header className="mb-6">
          <h1 className="text-2xl font-heading text-primary">Aurum</h1>
          <p className="text-xs font-body text-muted-foreground">Your personal financial advisor</p>
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
