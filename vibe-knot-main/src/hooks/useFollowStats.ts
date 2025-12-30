import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FollowStats {
  followers: number;
  following: number;
  posts: number;
}

export const useFollowStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<FollowStats>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      setStats({
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
        posts: postsRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [userId]);

  return { stats, loading };
};
