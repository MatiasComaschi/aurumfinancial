import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preference_key, preference_value')
      .eq('user_id', user.id);

    if (!error && data) {
      const prefs: Record<string, string> = {};
      data.forEach((row: any) => {
        prefs[row.preference_key] = row.preference_value;
      });
      setPreferences(prefs);
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const setPreference = useCallback(async (key: string, value: string) => {
    if (!user) return;
    setPreferences(prev => ({ ...prev, [key]: value }));

    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, preference_key: key, preference_value: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,preference_key' }
      );

    if (error) console.error('Failed to save preference:', error);
  }, [user]);

  const getPreference = useCallback((key: string, defaultValue?: string) => {
    return preferences[key] ?? defaultValue;
  }, [preferences]);

  return { preferences, isLoaded, setPreference, getPreference, fetchPreferences };
}
