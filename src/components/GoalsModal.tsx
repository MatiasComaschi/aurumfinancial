import { useState } from 'react';
import { Goal, PlaidAccount, Transaction } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface GoalsModalProps {
  open: boolean;
  onClose: () => void;
  goals: Goal[];
  accounts: PlaidAccount[];
  onAdd: (name: string, target: number, current: number, linkedAccountId: string | null) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Pick<Goal, 'name' | 'target_amount' | 'current_amount' | 'linked_account_id'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function GoalsModal({ open, onClose, goals, accounts, onAdd, onUpdate, onDelete }: GoalsModalProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', target: '', current: '', linkedAccountId: '' });

  const resetForm = () => {
    setForm({ name: '', target: '', current: '', linkedAccountId: '' });
    setEditing(null);
    setAdding(false);
  };

  const startEdit = (g: Goal) => {
    setEditing(g.id);
    setAdding(false);
    setForm({
      name: g.name,
      target: String(g.target_amount),
      current: String(g.current_amount),
      linkedAccountId: g.linked_account_id || '',
    });
  };

  const handleSave = async () => {
    const target = parseFloat(form.target);
    const current = parseFloat(form.current) || 0;
    if (!form.name || isNaN(target) || target <= 0) return;

    const linkedId = form.linkedAccountId || null;

    if (editing) {
      await onUpdate(editing, { name: form.name, target_amount: target, current_amount: current, linked_account_id: linkedId });
    } else {
      await onAdd(form.name, target, current, linkedId);
    }
    resetForm();
  };

  const showForm = adding || editing;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose(); } }}>
      <DialogContent className="bg-card border-border max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-foreground">Manage Goals</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {goals.map(g => (
            <div key={g.id} className={`bg-secondary rounded-lg p-3 ${editing === g.id ? 'ring-1 ring-primary' : ''}`}>
              {editing === g.id ? null : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-body text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${g.current_amount.toLocaleString()} / ${g.target_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(g)} className="p-1.5 text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(g.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {showForm && (
            <div className="bg-secondary rounded-lg p-3 space-y-2">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Goal name"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="Target $"
                  type="number"
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  value={form.current}
                  onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="Current $"
                  type="number"
                  disabled={!!form.linkedAccountId}
                  className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              {accounts.length > 0 && (
                <select
                  value={form.linkedAccountId}
                  onChange={e => setForm(f => ({ ...f, linkedAccountId: e.target.value, current: '' }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">No linked account (manual)</option>
                  {accounts.map(a => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name} — {a.institution_name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-heading hover:opacity-90 transition-opacity"
                >
                  {editing ? 'Save' : 'Add Goal'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add a Goal
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
