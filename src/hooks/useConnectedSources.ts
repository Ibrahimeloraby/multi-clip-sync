import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockConnectedSources } from '@/data/mockData';
import type { ConnectedSource } from '@/types/knowledge';

function rowToSource(row: any): ConnectedSource {
  return {
    id: row.id,
    type: row.source_type,
    label: row.label,
    status: row.status,
    itemsTagged: row.items_tagged ?? 0,
    lastSync: row.last_sync ? new Date(row.last_sync) : new Date(0),
    tagInstruction: row.tag_instruction ?? '',
  };
}

export function useConnectedSources() {
  return useQuery({
    queryKey: ['hub_connected_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_connected_sources')
        .select('*')
        .eq('org_id', 'default')
        .order('source_type');

      if (error || !data?.length) return mockConnectedSources;
      return data.map(rowToSource);
    },
    staleTime: 60_000,
  });
}

export function useUpdateSourceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'connected' | 'pending' | 'disconnected' }) => {
      const { error } = await supabase
        .from('hub_connected_sources')
        .update({ status, last_sync: status === 'connected' ? new Date().toISOString() : undefined })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hub_connected_sources'] }),
  });
}
