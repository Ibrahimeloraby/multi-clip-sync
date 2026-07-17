import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCommunity = (slug?: string) =>
  useQuery({
    queryKey: ["community", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("communities")
        .select("*, clubs(*)")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

export const useAllCommunities = () =>
  useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("*, clubs(*)")
        .order("member_count", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

export const useCommunitiesForClub = (clubId?: string) =>
  useQuery({
    queryKey: ["communities", "club", clubId],
    queryFn: async () => {
      if (!clubId) return [];
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("club_id", clubId);
      if (error) throw error;
      return data;
    },
    enabled: !!clubId,
  });

export const usePosts = (communityId?: string) =>
  useQuery({
    queryKey: ["posts", communityId],
    queryFn: async () => {
      if (!communityId) return [];
      const { data, error } = await supabase
        .from("posts")
        .select("*, fan_profiles(username, display_name, avatar_url)")
        .eq("community_id", communityId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });

export const usePostReplies = (postId?: string) =>
  useQuery({
    queryKey: ["replies", postId],
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("post_replies")
        .select("*, fan_profiles(username, display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

export const useTalkingPoints = (clubId?: string) =>
  useQuery({
    queryKey: ["talking_points", clubId],
    queryFn: async () => {
      const q = supabase
        .from("talking_points")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (clubId) q.eq("club_id", clubId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useIsMember = (communityId?: string, fanId?: string) =>
  useQuery({
    queryKey: ["is_member", communityId, fanId],
    queryFn: async () => {
      if (!communityId || !fanId) return false;
      const { data } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", communityId)
        .eq("fan_id", fanId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!communityId && !!fanId,
  });

export const useJoinCommunity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, fanId }: { communityId: string; fanId: string }) => {
      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: communityId, fan_id: fanId });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["is_member", vars.communityId, vars.fanId] });
      qc.invalidateQueries({ queryKey: ["community"] });
    },
  });
};

export const useCreatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { community_id: string; author_id: string; content: string }) => {
      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      await supabase.from("reward_transactions").insert({
        fan_id: payload.author_id,
        amount: 30,
        type: "earn",
        source: "community_post",
        description: "FanCoins for community post",
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["posts", data.community_id] });
    },
  });
};

export const useVotePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, fanId, vote }: { postId: string; fanId: string; vote: 1 | -1 }) => {
      const { error } = await supabase
        .from("post_votes")
        .upsert({ post_id: postId, fan_id: fanId, vote }, { onConflict: "post_id,fan_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};
