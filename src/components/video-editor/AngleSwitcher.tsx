import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Film, Crown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoItem {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_url: string | null;
  duration: number;
  uploaded_at: string;
  sequence_order?: number;
  profiles?: {
    username: string;
  };
}

interface AngleSwitcherProps {
  videos: VideoItem[];
  onReorder: (videos: VideoItem[]) => void;
  isOwnerView?: boolean;
  ownerId?: string;
}

interface SortableVideoItemProps {
  video: VideoItem;
  index: number;
  isOwner?: boolean;
}

const SortableVideoItem = ({ video, index, isOwner }: SortableVideoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-card rounded-lg border border-border transition-all',
        isDragging && 'shadow-lg border-primary/50 bg-card/95 z-10',
        'hover:border-primary/30'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted touch-manipulation"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Index */}
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="relative w-16 h-10 bg-muted rounded overflow-hidden shrink-0">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {video.profiles?.username || 'Unknown'}
          </p>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
              <Crown className="w-2.5 h-2.5" />
              owner
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {video.duration}s
          </span>
          <span>•</span>
          <span>
            {new Date(video.uploaded_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

const AngleSwitcher = ({
  videos,
  onReorder,
  isOwnerView = true,
  ownerId,
}: AngleSwitcherProps) => {
  const [items, setItems] = useState(videos);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onReorder(newItems);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <Film className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No videos to reorder</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((v) => v.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((video, index) => (
            <SortableVideoItem
              key={video.id}
              video={video}
              index={index}
              isOwner={ownerId ? video.user_id === ownerId : false}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default AngleSwitcher;
