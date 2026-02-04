import { useState, useCallback, useRef } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  askPermission?: boolean;
}

const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }
};

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = false,
    timeout = 5000,
    maximumAge = 0,
    askPermission = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    permissionStatus: 'unknown',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const permissionCheckedRef = useRef(false);

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState(prev => ({ ...prev, permissionStatus: result.state as any }));
      return result.state;
    } catch {
      return 'unknown';
    }
  }, []);

  const requestLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        permissionStatus: 'denied',
      }));
      return null;
    }

    if (!permissionCheckedRef.current) {
      const permission = await checkPermission();
      permissionCheckedRef.current = true;

      if (permission === 'denied') {
        setState(prev => ({
          ...prev,
          error: 'Location permission denied',
          permissionStatus: 'denied',
        }));
        return null;
      }

      if (permission === 'prompt' && !askPermission) {
        setState(prev => ({
          ...prev,
          error: null,
          permissionStatus: 'prompt',
        }));
        return null;
      }
    }

    if (state.permissionStatus === 'denied') {
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    abortControllerRef.current = new AbortController();

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Location request timed out',
        }));
        resolve(null);
      }, timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setState({
            latitude: coords.latitude,
            longitude: coords.longitude,
            error: null,
            loading: false,
            permissionStatus: 'granted',
          });

          triggerHaptic('light');
          resolve(coords);
        },
        (error) => {
          clearTimeout(timeoutId);

          let errorMessage = 'Failed to get location';
          let permissionStatus: GeolocationState['permissionStatus'] = 'unknown';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              permissionStatus = 'denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = error.message || 'Unknown location error';
          }

          setState({
            latitude: null,
            longitude: null,
            error: errorMessage,
            loading: false,
            permissionStatus,
          });

          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, askPermission, checkPermission, state.permissionStatus]);

  const getLocationSilently = useCallback(async () => {
    return requestLocation();
  }, [requestLocation]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    permissionCheckedRef.current = false;
    setState({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
      permissionStatus: 'unknown',
    });
  }, []);

  return {
    ...state,
    requestLocation,
    getLocationSilently,
    checkPermission,
    reset,
  };
};
