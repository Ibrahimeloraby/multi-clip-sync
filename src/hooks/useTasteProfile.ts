import { useState, useEffect } from 'react';
import { TasteProfile } from '@/lib/tasteEngine';

const STORAGE_KEY = 'taste_profile_v1';

export function useTasteProfile() {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
    setIsLoaded(true);
  }, []);

  const saveProfile = (p: TasteProfile) => {
    const stamped = { ...p, completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    setProfile(stamped);
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  };

  return { profile, saveProfile, clearProfile, isLoaded };
}
