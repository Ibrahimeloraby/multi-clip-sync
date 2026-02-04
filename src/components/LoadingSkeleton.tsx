import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-muted',
      className
    )}
  />
);

export const VideoCardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-video w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const VideoListItemSkeleton = () => (
  <div className="flex items-center gap-3 p-2">
    <Skeleton className="w-16 h-10 rounded shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
    <div className="flex gap-1">
      <Skeleton className="w-8 h-8 rounded" />
      <Skeleton className="w-8 h-8 rounded" />
    </div>
  </div>
);

export const SessionCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-5 h-5 rounded" />
    </div>
  </div>
);

export const FeedVideoSkeleton = () => (
  <div className="h-full w-full relative">
    <Skeleton className="absolute inset-0" />
    <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5">
      <Skeleton className="w-12 h-12 rounded-full" />
      <Skeleton className="w-12 h-12 rounded-full" />
      <Skeleton className="w-12 h-12 rounded-full" />
    </div>
    <div className="absolute left-4 right-20 bottom-24 space-y-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton className="w-10 h-10 rounded-full" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

export const CommentSkeleton = () => (
  <div className="flex gap-3 p-3">
    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

export const ShimmerSkeleton = ({ className }: SkeletonProps) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-md bg-muted',
      className
    )}
  >
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export default {
  Skeleton,
  VideoCardSkeleton,
  VideoListItemSkeleton,
  SessionCardSkeleton,
  FeedVideoSkeleton,
  ProfileSkeleton,
  CommentSkeleton,
  ShimmerSkeleton,
};
