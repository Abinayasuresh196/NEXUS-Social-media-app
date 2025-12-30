import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

export interface UserWithStories {
  user_id: string;
  profile: Profile;
  stories: Story[];
  hasUnviewed: boolean;
}

export const useStories = () => {
  const { user } = useAuth();
  const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    if (!user) {
      setUsersWithStories([]);
      setMyStories([]);
      setLoading(false);
      return;
    }

    // Fetch all active stories
    const { data: storiesData, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !storiesData) {
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(storiesData.map(s => s.user_id))];

    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    const profilesMap = new Map<string, Profile>();
    profilesData?.forEach(p => profilesMap.set(p.user_id, p as Profile));

    // Fetch viewed stories by current user
    const storyIds = storiesData.map(s => s.id);
    const { data: viewedData } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', user.id)
      .in('story_id', storyIds);

    const viewedSet = new Set(viewedData?.map(v => v.story_id) || []);

    // Group stories by user
    const storiesByUser = new Map<string, Story[]>();
    storiesData.forEach(story => {
      const existing = storiesByUser.get(story.user_id) || [];
      existing.push(story as Story);
      storiesByUser.set(story.user_id, existing);
    });

    // Build users with stories array
    const usersArray: UserWithStories[] = [];
    
    storiesByUser.forEach((stories, userId) => {
      const profile = profilesMap.get(userId);
      if (profile) {
        const hasUnviewed = stories.some(s => !viewedSet.has(s.id));
        usersArray.push({
          user_id: userId,
          profile,
          stories,
          hasUnviewed,
        });
      }
    });

    // Sort: current user first, then users with unviewed stories
    usersArray.sort((a, b) => {
      if (a.user_id === user.id) return -1;
      if (b.user_id === user.id) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    setUsersWithStories(usersArray);
    setMyStories(storiesByUser.get(user.id) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const markAsViewed = async (storyId: string) => {
    if (!user) return;

    await supabase
      .from('story_views')
      .insert({ story_id: storyId, viewer_id: user.id })
      .select();
  };

  const createStory = async (mediaUrl: string, mediaType: string = 'image') => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
      })
      .select()
      .single();

    if (!error) {
      fetchStories();
    }

    return { data, error };
  };

  return {
    usersWithStories,
    myStories,
    loading,
    fetchStories,
    markAsViewed,
    createStory,
  };
};
