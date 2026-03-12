import { useState } from 'react';
import { Trash2, Plus, Brain } from 'lucide-react';
import { UserMemory } from '@/lib/types';
import { toast } from 'sonner';

const MEMORY_TYPE_LABELS: Record<UserMemory['memory_type'], { label: string; emoji: string }> = {
  commitment: { label: 'Commitments', emoji: '🤝' },
  goals_context: { label: 'Goals Context', emoji: '🎯' },
  habit: { label: 'Habits', emoji: '🔄' },
  preference: { label: 'Preferences', emoji: '⚙️' },
  life_context: { label: 'Life Context', emoji: '🏠' },
};

const MEMORY_TYPES = Object.keys(MEMORY_TYPE_LABELS) as UserMemory['memory_type'][];

interface MemoryTabProps {
  memories: UserMemory[];
  isLoading: boolean;
  onAdd: (type: UserMemory['memory_type'], content: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

export default function MemoryTab({ memories, isLoading, onAdd, onDelete }: MemoryTabProps) {
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<UserMemory['memory_type']>('commitment');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    setIsAdding(true);
    const error = await onAdd(newType, trimmed);
    if (error) {
      toast.error('Failed to save memory');
    } else {
      setNewContent('');
      toast.success('Memory saved');
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    const error = await onDelete(id);
    if (error) toast.error('Failed to delete');
  };

  const grouped = MEMORY_TYPES.reduce((acc, type) => {
    acc[type] = memories.filter(m => m.memory_type === type);
    return acc;
  }, {} as Record<string, UserMemory[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Brain className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg text-primary">What Claude Knows</h2>
      </div>
      <p className="text-xs text-muted-foreground font-body">
        Claude automatically remembers important things you share. You can also add or remove memories here.
      </p>

      {MEMORY_TYPES.map(type => {
        const items = grouped[type];
        if (!items || items.length === 0) return null;
        const { label, emoji } = MEMORY_TYPE_LABELS[type];
        return (
          <div key={type} className="space-y-2">
            <h3 className="text-sm font-heading text-foreground">
              {emoji} {label}
            </h3>
            {items.map(m => (
              <div key={m.id} className="bg-card rounded-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-foreground">{m.content}</p>
                  {m.context_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.context_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {memories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm font-body">
          No memories yet. Chat with Claude in the Ask tab and important things will be remembered automatically.
        </div>
      )}

      {/* Manual add */}
      <div className="bg-card rounded-lg p-4 space-y-3 mt-4">
        <h3 className="text-sm font-heading text-foreground">Add a memory manually</h3>
        <select
          value={newType}
          onChange={e => setNewType(e.target.value as UserMemory['memory_type'])}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground"
        >
          {MEMORY_TYPES.map(t => (
            <option key={t} value={t}>
              {MEMORY_TYPE_LABELS[t].emoji} {MEMORY_TYPE_LABELS[t].label}
            </option>
          ))}
        </select>
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="e.g. I want to save $500/month for a house down payment"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={!newContent.trim() || isAdding}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-body disabled:opacity-40 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Saving...' : 'Save Memory'}
        </button>
      </div>
    </div>
  );
}
