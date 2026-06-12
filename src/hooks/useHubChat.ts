import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { departmentConfig } from '@/data/mockData';
import type { ChatMessage, Department } from '@/types/knowledge';

const MOCK_RESPONSES: Record<string, string> = {
  risk: `Based on tagged learnings across all departments, here are the active risks:\n\n**1. Cyber Vendor Gap (Risk)** — Two critical vendors lack SOC2 certification (£800K spend). 90-day window.\n\n**2. Engineering Attrition (HR)** — 14% attrition, 3-year high. Benchmarking due June 15.\n\n**3. GDPR Article 22 (Compliance)** — AI lead scoring model may breach automated decision rules. Legal review started.\n\n**4. Series B Milestone (Board)** — ARR must reach £8M by December. Current trajectory needs monitoring.`,
  decision: `Key decisions tagged this week:\n\n**Marketing** — Shift 30% paid social from Meta to LinkedIn (18% better CPL)\n\n**Finance** — Q1 HC underspend recommended for reallocation to H2 cloud infra\n\n**Operations** — Approve full rollout of warehouse routing algo to all 8 sites (£1.4M saving)\n\n**Board** — £15M Series B extension approved, ARR milestone condition attached`,
  cloud: `**IT & Cloud Migration Status:**\n\nAWS migration is **6 of 9 core services complete**. Three services remain blocked on legacy Oracle DB dependencies.\n\n> "Cloud infra team estimates 6-week effort to refactor Oracle dependencies" — Kevin Torres, IT\n\nCost optimisation dashboard is live in Power BI. Cloud spend tracking is active.`,
};

function buildMockResponse(query: string, dept: Department | 'all'): string {
  const q = query.toLowerCase();
  if (q.includes('risk') || q.includes('threat')) return MOCK_RESPONSES.risk;
  if (q.includes('decision') || q.includes('week') || q.includes('summary')) return MOCK_RESPONSES.decision;
  if (q.includes('cloud') || q.includes('migration') || q.includes('aws') || q.includes('it')) return MOCK_RESPONSES.cloud;
  const label = dept === 'all' ? 'all departments' : departmentConfig[dept]?.label ?? dept;
  return `I searched tagged learnings across **${label}** for your query.\n\nThe most relevant insight: the company is making strong progress on operational efficiency (+22% warehouse picking) and has key decisions pending in Finance (cloud infra reallocation) and HR (compensation benchmarking due June 15).\n\nWould you like me to drill into a specific department or topic?`;
}

export function useHubChat(initialDept: Department | 'all' = 'all') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string, dept: Department | 'all') => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      department: dept,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Create session on first message
      let sid = sessionId;
      if (!sid) {
        const { data } = await supabase
          .from('hub_chat_sessions')
          .insert({ department: dept, title: content.slice(0, 60) })
          .select()
          .single();
        sid = data?.id ?? null;
        setSessionId(sid);
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('hub-chat', {
        body: {
          query: content,
          department: dept,
          sessionId: sid,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        },
      });

      let responseText: string;
      let sources: ChatMessage['sources'] = [];

      if (error || !data?.response) {
        // Graceful fallback to mock
        responseText = buildMockResponse(content, dept);
      } else {
        responseText = data.response;
        sources = data.sources ?? [];
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        department: dept,
        sources,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, sessionId]);

  return { messages, isLoading, sendMessage };
}
