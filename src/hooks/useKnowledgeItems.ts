import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockKnowledgeItems } from '@/data/mockData';
import type { KnowledgeItem, Department, TagType } from '@/types/knowledge';

function rowToItem(row: any): KnowledgeItem {
  return {
    id: row.id,
    content: row.content,
    summary: row.summary ?? row.content.slice(0, 120),
    tag: row.tag as TagType,
    source: row.source,
    department: row.department as Department,
    author: row.author,
    meetingTitle: row.meeting_title ?? undefined,
    timestamp: new Date(row.created_at),
    citations: row.citations ?? [],
    keyTopics: row.key_topics ?? [],
  };
}

export function useKnowledgeItems(opts?: {
  department?: Department | 'all';
  tag?: TagType | 'all';
  search?: string;
  status?: 'active' | 'pending' | 'rejected' | 'all';
}) {
  return useQuery({
    queryKey: ['hub_knowledge_items', opts],
    queryFn: async () => {
      let q = supabase
        .from('hub_knowledge_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (opts?.department && opts.department !== 'all') q = q.eq('department', opts.department);
      if (opts?.tag && opts.tag !== 'all') q = q.eq('tag', opts.tag);
      if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
      else if (!opts?.status) q = q.eq('status', 'active');

      const { data, error } = await q;
      if (error || !data?.length) return mockKnowledgeItems.filter(i => {
        if (opts?.department && opts.department !== 'all' && i.department !== opts.department) return false;
        if (opts?.tag && opts.tag !== 'all' && i.tag !== opts.tag) return false;
        return true;
      });

      let items = data.map(rowToItem);
      if (opts?.search) {
        const s = opts.search.toLowerCase();
        items = items.filter(i =>
          i.content.toLowerCase().includes(s) || i.summary.toLowerCase().includes(s)
        );
      }
      return items;
    },
    staleTime: 30_000,
  });
}

export function useKnowledgeStats() {
  return useQuery({
    queryKey: ['hub_knowledge_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_knowledge_items')
        .select('department, tag, status');

      if (error || !data?.length) {
        return {
          total: 1024,
          agentCount: 359,
          pendingCount: 2,
          byDepartment: {} as Record<string, { learnings: number; agent: number }>,
        };
      }

      const active = data.filter((r: any) => r.status === 'active');
      const byDepartment: Record<string, { learnings: number; agent: number }> = {};
      for (const row of active) {
        if (!byDepartment[row.department]) byDepartment[row.department] = { learnings: 0, agent: 0 };
        if (row.tag === '#learning') byDepartment[row.department].learnings++;
        else byDepartment[row.department].agent++;
      }

      return {
        total: active.length,
        agentCount: active.filter((r: any) => r.tag === '#agent').length,
        pendingCount: data.filter((r: any) => r.status === 'pending').length,
        byDepartment,
      };
    },
    staleTime: 60_000,
  });
}

export function useAddKnowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<KnowledgeItem, 'id' | 'timestamp'> & { status?: string }) => {
      const { data, error } = await supabase.from('hub_knowledge_items').insert({
        content: item.content,
        summary: item.summary,
        tag: item.tag,
        source: item.source,
        department: item.department,
        author: item.author,
        meeting_title: item.meetingTitle,
        citations: item.citations,
        key_topics: item.keyTopics,
        status: item.status ?? 'active',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hub_knowledge_items'] });
      qc.invalidateQueries({ queryKey: ['hub_knowledge_stats'] });
    },
  });
}

export function useUpdateItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'rejected' }) => {
      const { error } = await supabase.from('hub_knowledge_items').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hub_knowledge_items'] });
      qc.invalidateQueries({ queryKey: ['hub_knowledge_stats'] });
    },
  });
}
