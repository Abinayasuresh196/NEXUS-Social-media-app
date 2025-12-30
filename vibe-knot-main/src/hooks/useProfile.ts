import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();

    // Set up real-time subscription for profile updates
    profileChannelRef.current = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Profile>) => {
          if (payload.new) {
            setProfile(payload.new as Profile);
          }
        },
      )
      .subscribe();

    return () => {
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current);
      }
    };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      // Update local state immediately
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null, data };
    } catch (error) {
      console.error('Unexpected error updating profile:', error);
      return { error: error as Error };
    }
  };

  return { profile, loading, updateProfile };
};

export const useProfileById = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading };
};

export const useProfileByUsername = (username: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  return { profile, loading };
};
