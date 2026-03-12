import { supabase } from '@/integrations/supabase/client';
import { Transaction, Goal, ChatMessage } from './types';

export function formatTransactionsForAI(transactions: Transaction[]): string {
  return transactions
    .map(t => `${t.date} | ${t.merchant} | $${Math.abs(t.amount).toFixed(2)} | ${t.category}`)
    .join('\n');
}

export function formatGoalsForAI(goals: Goal[]): string {
  return goals
    .map(g => {
      let line = `${g.name}: $${g.current_amount} saved of $${g.target_amount} goal`;
      if (g.target_date) line += ` (target date: ${g.target_date})`;
      return line;
    })
    .join('\n');
}

export async function analyzeFinances(
  transactions: Transaction[],
  goals: Goal[],
): Promise<string> {
  const userMessage = `Here are my transactions for the past 60 days:\n${formatTransactionsForAI(transactions)}\n\nMy financial goals:\n${formatGoalsForAI(goals)}\n\nPlease give me a full financial analysis and advisor report.`;

  const { data, error } = await supabase.functions.invoke('financial-advisor', {
    body: {
      messages: [{ role: 'user', content: userMessage }],
    },
  });

  if (error) throw new Error(error.message || 'Failed to analyze finances');
  return data.content;
}

export async function chatWithAdvisor(
  transactions: Transaction[],
  goals: Goal[],
  chatHistory: ChatMessage[],
  newMessage: string,
): Promise<string> {
  const contextMessage = `My transaction data (60 days):\n${formatTransactionsForAI(transactions)}\n\nMy goals:\n${formatGoalsForAI(goals)}`;

  const messages: ChatMessage[] = [
    { role: 'user', content: contextMessage },
    { role: 'assistant', content: "Got it, I have your full financial picture. Ask me anything." },
    ...chatHistory,
    { role: 'user', content: newMessage },
  ];

  const { data, error } = await supabase.functions.invoke('financial-advisor', {
    body: {
      messages,
    },
  });

  if (error) throw new Error(error.message || 'Failed to get response');
  return data.content;
}

export async function extractMemories(userMessage: string): Promise<{ memory_type: string; content: string; context_date: string }[]> {
  try {
    const { data, error } = await supabase.functions.invoke('financial-advisor', {
      body: { mode: 'extract_memory', userMessage },
    });
    if (error || !data?.memories) return [];
    return data.memories;
  } catch {
    return [];
  }
}

export function parseAdviceSections(text: string): { emoji: string; title: string; content: string }[] {
  const headers = [
    '💰 CASH FLOW SNAPSHOT',
    '🚨 FLAGGED TRANSACTIONS',
    '📈 SAVINGS & GOALS',
    '💳 DEBT STRATEGY',
    '🌱 INVESTMENT PLAN',
    '📝 YOUR COMMITMENTS',
    '✅ YOUR ACTION LIST (ranked by impact)',
  ];
  const sections: { emoji: string; title: string; content: string }[] = [];

  for (let i = 0; i < headers.length; i++) {
    const startIdx = text.indexOf(headers[i]);
    if (startIdx === -1) continue;

    const contentStart = startIdx + headers[i].length;
    let contentEnd = text.length;
    for (let j = i + 1; j < headers.length; j++) {
      const nextIdx = text.indexOf(headers[j]);
      if (nextIdx !== -1) {
        contentEnd = nextIdx;
        break;
      }
    }

    const emoji = headers[i].substring(0, 2);
    const title = headers[i].substring(2).trim();
    const content = text.substring(contentStart, contentEnd).trim();
    sections.push({ emoji, title, content });
  }

  if (sections.length === 0) {
    sections.push({ emoji: '📊', title: 'Analysis', content: text });
  }

  return sections;
}
