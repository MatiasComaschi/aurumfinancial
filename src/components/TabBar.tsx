import { BarChart3, List, Lightbulb, MessageCircle, Brain, Settings } from 'lucide-react';

type TabId = 'overview' | 'transactions' | 'advice' | 'ask' | 'memory' | 'settings';

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'transactions', label: 'Txns', icon: List },
  { id: 'advice', label: 'Advice', icon: Lightbulb },
  { id: 'ask', label: 'Ask', icon: MessageCircle },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border z-50">
      <div className="flex">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
              activeTab === id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="font-body">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
