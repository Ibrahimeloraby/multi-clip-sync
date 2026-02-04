import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, Save, X } from 'lucide-react';
import AngleSwitcher from './video-editor/AngleSwitcher';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VideoItem {
  id: string;
  user_id: string;
  device_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  sequence_order?: number;
  profiles?: {
    username: string;
  };
}

interface SessionAngleSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  videos: VideoItem[];
  onSave: () => void;
}

const SessionAngleSwitcher = ({
  open,
  onOpenChange,
  sessionId,
  videos,
  onSave,
}: SessionAngleSwitcherProps) => {
  const [orderedVideos, setOrderedVideos] = useState(videos);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleReorder = (reorderedVideos: VideoItem[]) => {
    setOrderedVideos(reorderedVideos);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update sequence_order for each video
      const updates = orderedVideos.map((video, index) => ({
        id: video.id,
        sequence_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('videos')
          .update({ sequence_order: update.sequence_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Video sequence saved!');
      setHasChanges(false);
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save sequence:', error);
      toast.error('Failed to save video sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onOpenChange(false);
        setOrderedVideos(videos);
        setHasChanges(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Edit Video Sequence
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop videos to reorder them. The sequence determines the playback order in multi-angle view.
          </p>

          <div className="overflow-y-auto max-h-[50vh]">
            <AngleSwitcher
              videos={orderedVideos}
              onReorder={handleReorder}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="gradient-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Sequence'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionAngleSwitcher;
