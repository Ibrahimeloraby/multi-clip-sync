import { useState, useEffect, useRef } from 'react';
import { Film, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoThumbnailProps {
  src: string | null;
  alt?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'portrait';
  showPlayIcon?: boolean;
  onClick?: () => void;
  lazy?: boolean;
}

const VideoThumbnail = ({
  src,
  alt = '',
  className,
  aspectRatio = 'video',
  showPlayIcon = true,
  onClick,
  lazy = true,
}: VideoThumbnailProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy]);

  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[9/16]',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-muted rounded',
        aspectClasses[aspectRatio],
        onClick && 'cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Image */}
      {isInView && src && !error && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}

      {/* Error fallback */}
      {(error || !src) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="w-6 h-6 text-muted-foreground/50" />
        </div>
      )}

      {/* Play overlay */}
      {showPlayIcon && onClick && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoThumbnail;
