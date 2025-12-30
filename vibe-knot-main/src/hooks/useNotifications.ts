import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Notification, Profile, Post } from '@/types/database';

export interface NotificationWithDetails extends Omit<Notification, 'actor' | 'post'> {
  actor: Profile | null;
  post: Post | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log('Fetching notifications for user:', user.id);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('Raw notifications data:', data);
    console.log('Notifications error:', error);

    if (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    if (!data) {
      console.log('No notification data returned');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    console.log(`Found ${data.length} notifications`);
    
    // Fetch actor profiles with error handling
    const actorIds = [...new Set(data.map(n => n.actor_id))];
    console.log('Fetching profiles for actors:', actorIds);
    
    if (actorIds.length > 0) {
      try {
        const { data: actorProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', actorIds);

        if (profilesError) {
          console.error('Error fetching actor profiles:', profilesError);
          throw profilesError;
        }

        console.log('Actor profiles fetched:', actorProfiles);

        const profilesMap = new Map<string, Profile>();
        actorProfiles?.forEach(p => profilesMap.set(p.user_id, p as Profile));
      } catch (err) {
        console.error('Failed to fetch actor profiles:', err);
        throw err;
      }
    } else {
      console.log('No actor IDs to fetch');
    }

    // Create profilesMap
    const profilesMap = new Map<string, Profile>();
    if (actorIds.length > 0) {
      const { data: actorProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', actorIds);
      actorProfiles?.forEach(p => profilesMap.set(p.user_id, p as Profile));
    }

    // Fetch posts for notifications that have post_id
    const postIds = data.filter(n => n.post_id).map(n => n.post_id as string);
    console.log('Fetching posts for notifications:', postIds);
    
    let postsMap = new Map<string, Post>();
    
    if (postIds.length > 0) {
      try {
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds);

        if (postsError) {
          console.error('Error fetching posts:', postsError);
          throw postsError;
        }

        console.log('Posts fetched:', posts);

        postsMap = new Map<string, Post>();
        posts?.forEach(p => postsMap.set(p.id, p as Post));
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    } else {
      console.log('No post IDs to fetch');
    }

    const typedNotifications: NotificationWithDetails[] = data.map(n => ({
      ...n,
      type: n.type as 'like' | 'comment' | 'follow' | 'mention',
      actor: profilesMap.get(n.actor_id) || null,
      post: n.post_id ? postsMap.get(n.post_id) || null : null,
    }));
    
    console.log('Final notifications with details:', typedNotifications);
    setNotifications(typedNotifications);
    setUnreadCount(typedNotifications.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Ensure unreadCount is always a number
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0;

  return { notifications, unreadCount: safeUnreadCount, loading, markAsRead, markAllAsRead, refetch: fetchNotifications };
};
