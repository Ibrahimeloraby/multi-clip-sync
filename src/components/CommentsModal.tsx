import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommentSkeleton } from './LoadingSkeleton';
import { SOCIAL } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  currentUserId?: string;
}

const CommentsModal = ({
  open,
  onOpenChange,
  videoId,
  currentUserId,
}: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && videoId) {
      fetchComments();
      const channel = subscribeToComments();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, videoId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*, profiles(*)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })
        .limit(SOCIAL.COMMENTS_PAGE_SIZE);

      if (error) throw error;
      setComments(data as Comment[]);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    return supabase
      .channel(`comments-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_comments',
          filter: `video_id=eq.${videoId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || !currentUserId) {
      if (!currentUserId) {
        toast.error('Please sign in to comment');
      }
      return;
    }

    if (newComment.length > SOCIAL.MAX_COMMENT_LENGTH) {
      toast.error(`Comment must be less than ${SOCIAL.MAX_COMMENT_LENGTH} characters`);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          user_id: currentUserId,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');

      // Scroll to bottom after adding comment
      setTimeout(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        {/* Comments list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] -mx-6 px-6"
        >
          {loading ? (
            <div className="space-y-2">
              <CommentSkeleton />
              <CommentSkeleton />
              <CommentSkeleton />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground/70">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      comment.profiles?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {comment.profiles?.username || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {comment.user_id === currentUserId && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment input */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUserId ? "Add a comment..." : "Sign in to comment"}
            disabled={!currentUserId || submitting}
            maxLength={SOCIAL.MAX_COMMENT_LENGTH}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || !currentUserId || submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        {newComment.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {newComment.length}/{SOCIAL.MAX_COMMENT_LENGTH}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CommentsModal;
