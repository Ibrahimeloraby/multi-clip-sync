import { useEffect, useRef } from 'react';

export const useMediaCleanup = () => {
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const mediaStreamsRef = useRef<Set<MediaStream>>(new Set());

  const trackObjectUrl = (url: string) => {
    objectUrlsRef.current.add(url);
    return url;
  };

  const trackMediaStream = (stream: MediaStream) => {
    mediaStreamsRef.current.add(stream);
    return stream;
  };

  const revokeObjectUrl = (url: string) => {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const stopMediaStream = (stream: MediaStream) => {
    if (mediaStreamsRef.current.has(stream)) {
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      mediaStreamsRef.current.delete(stream);
    }
  };

  const cleanup = () => {
    objectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to revoke object URL:', error);
      }
    });
    objectUrlsRef.current.clear();

    mediaStreamsRef.current.forEach(stream => {
      try {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (error) {
        console.error('Failed to stop media stream:', error);
      }
    });
    mediaStreamsRef.current.clear();
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    trackObjectUrl,
    trackMediaStream,
    revokeObjectUrl,
    stopMediaStream,
    cleanup,
  };
};
