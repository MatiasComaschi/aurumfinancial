import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserMemory } from '@/lib/types';
import { useAuth } from './useAuth';

export function useMemories() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMemories(data as unknown as UserMemory[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const addMemory = async (memory_type: UserMemory['memory_type'], content: string) => {
    if (!user) return;
    const { error } = await supabase.from('user_memory').insert({
      user_id: user.id,
      memory_type,
      content,
      context_date: new Date().toISOString(),
    });
    if (!error) fetchMemories();
    return error;
  };

  const deleteMemory = async (id: string) => {
    const { error } = await supabase.from('user_memory').delete().eq('id', id);
    if (!error) setMemories(prev => prev.filter(m => m.id !== id));
    return error;
  };

  const buildMemoryBlock = useCallback((): string => {
    if (memories.length === 0) return '';

    const grouped: Record<string, UserMemory[]> = {};
    for (const m of memories) {
      if (!grouped[m.memory_type]) grouped[m.memory_type] = [];
      grouped[m.memory_type].push(m);
    }

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '';

    let block = `WHAT YOU ALREADY KNOW ABOUT THIS USER:\n\n`;

    if (grouped.commitment?.length) {
      block += `Commitments they have made:\n`;
      grouped.commitment.forEach(m => {
        block += `- ${m.content} (${formatDate(m.context_date)})\n`;
      });
      block += '\n';
    }
    if (grouped.goals_context?.length) {
      block += `Goals context they have shared:\n`;
      grouped.goals_context.forEach(m => { block += `- ${m.content}\n`; });
      block += '\n';
    }
    if (grouped.habit?.length) {
      block += `Habits they have acknowledged:\n`;
      grouped.habit.forEach(m => { block += `- ${m.content}\n`; });
      block += '\n';
    }
    if (grouped.preference?.length) {
      block += `How they want to be advised:\n`;
      grouped.preference.forEach(m => { block += `- ${m.content}\n`; });
      block += '\n';
    }
    if (grouped.life_context?.length) {
      block += `Life context:\n`;
      grouped.life_context.forEach(m => { block += `- ${m.content}\n`; });
      block += '\n';
    }

    block += `IMPORTANT: Use this memory actively in every response. If the user made a commitment and their transactions show they did not follow through, call it out with kindness not shame. If they are following through, acknowledge it and make them feel it. Make the user feel like you have been paying attention the whole time because you have.`;

    return block;
  }, [memories]);

  return { memories, isLoading, addMemory, deleteMemory, fetchMemories, buildMemoryBlock };
}
