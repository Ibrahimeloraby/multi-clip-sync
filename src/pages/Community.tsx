import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/layout/AppShell";
import { useMyPassport } from "@/hooks/useFanProfile";
import { useCommunity, usePosts, useIsMember, useJoinCommunity, useCreatePost, useVotePost, useTalkingPoints } from "@/hooks/useCommunity";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronUp, ChevronDown, MessageSquare, Send } from "lucide-react";

export default function Community() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [newPost, setNewPost] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/auth");
      else setUserId(data.user.id);
    });
  }, []);

  const { data: passport } = useMyPassport(userId);
  const { data: community } = useCommunity(slug);
  const { data: posts } = usePosts(community?.id);
  const { data: isMember } = useIsMember(community?.id, userId);
  const { data: talkingPoints } = useTalkingPoints(community?.club_id ?? undefined);
  const joinCommunity = useJoinCommunity();
  const createPost = useCreatePost();
  const votePost = useVotePost();

  const clubColor = community?.clubs?.primary_color ?? "#00FF87";

  const handleJoin = () => {
    if (!userId || !community) return navigate("/auth");
    joinCommunity.mutate({ communityId: community.id, fanId: userId });
  };

  const handlePost = async () => {
    if (!userId || !community || !newPost.trim()) return;
    await createPost.mutateAsync({ community_id: community.id, author_id: userId, content: newPost.trim() });
    setNewPost("");
    setShowCompose(false);
  };

  return (
    <AppShell coinBalance={passport?.fan_coins_balance ?? 0}>
      <div className="pb-8">
        {/* Community header */}
        <div
          className="px-4 pt-4 pb-6 relative"
          style={{ background: `linear-gradient(180deg, ${clubColor}20 0%, transparent 100%)` }}
        >
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-white/40 text-sm">
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black text-white">{community?.name}</h1>
              <p className="text-sm text-white/40 mt-0.5">
                {community?.member_count?.toLocaleString()} members · {community?.post_count} posts
              </p>
              {community?.description && (
                <p className="text-xs text-white/30 mt-2 max-w-xs">{community.description}</p>
              )}
            </div>

            {!isMember ? (
              <button
                onClick={handleJoin}
                className="px-4 py-2 rounded-xl text-sm font-bold text-[#0A0A0F]"
                style={{ background: clubColor }}
              >
                Join
              </button>
            ) : (
              <span className="text-xs text-[#00FF87] bg-[#00FF87]/10 px-3 py-1.5 rounded-full">Joined ✓</span>
            )}
          </div>
        </div>

        {/* AI Talking Points */}
        {talkingPoints && talkingPoints.length > 0 && (
          <div className="px-4 mb-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">🤖 AI Debate Starters</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {talkingPoints.map((tp) => (
                <div
                  key={tp.id}
                  className="flex-shrink-0 p-3 rounded-xl border border-white/10 bg-white/5 max-w-[220px]"
                >
                  <p className="text-xs text-white/70 leading-relaxed">{tp.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compose */}
        {isMember && (
          <div className="px-4 mb-4">
            {showCompose ? (
              <div className="p-3 rounded-2xl border border-white/20 bg-white/5">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your take..."
                  rows={3}
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 resize-none focus:outline-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-[#00FF87]">+30 FC for posting</span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCompose(false)} className="text-xs text-white/40 px-3 py-1.5 rounded-lg">
                      Cancel
                    </button>
                    <button
                      onClick={handlePost}
                      disabled={!newPost.trim() || createPost.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00FF87] text-[#0A0A0F] text-xs font-bold disabled:opacity-40"
                    >
                      <Send size={12} /> Post
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCompose(true)}
                className="w-full p-3 rounded-2xl border border-white/10 bg-white/5 text-left text-sm text-white/30 hover:border-white/20 transition-colors"
              >
                Share your take... <span className="text-[#00FF87] text-xs">+30 FC</span>
              </button>
            )}
          </div>
        )}

        {/* Posts */}
        <div className="px-4 space-y-3">
          {posts?.map((post: any) => (
            <div key={post.id} className="p-4 rounded-2xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-xs font-bold text-[#00FF87]">
                  {post.fan_profiles?.username?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium text-white/60">{post.fan_profiles?.username}</span>
                <span className="text-xs text-white/20">·</span>
                <span className="text-xs text-white/20">
                  {new Date(post.created_at).toLocaleDateString("en-GB")}
                </span>
                {post.is_pinned && <span className="text-[10px] text-[#FFB800] bg-[#FFB800]/10 px-1.5 py-0.5 rounded">📌 Pinned</span>}
              </div>

              <p className="text-sm text-white/80 leading-relaxed">{post.content}</p>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => userId && votePost.mutate({ postId: post.id, fanId: userId, vote: 1 })}
                    className="p-1 rounded hover:bg-[#00FF87]/10 transition-colors"
                  >
                    <ChevronUp size={16} className="text-white/30 hover:text-[#00FF87]" />
                  </button>
                  <span className="text-xs font-bold text-white/50">{post.vote_count}</span>
                  <button
                    onClick={() => userId && votePost.mutate({ postId: post.id, fanId: userId, vote: -1 })}
                    className="p-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <ChevronDown size={16} className="text-white/30 hover:text-red-400" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-white/30">
                  <MessageSquare size={13} />
                  <span className="text-xs">{post.reply_count}</span>
                </div>
              </div>
            </div>
          ))}

          {posts?.length === 0 && (
            <div className="text-center py-12 text-white/30">
              <p>No posts yet</p>
              {isMember && <p className="text-xs mt-1">Be the first to post!</p>}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
