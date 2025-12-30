import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Post, Profile } from '@/types/database';

export const useFeedPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && postsData) {
      // Fetch profiles for all posts
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profilesMap = new Map<string, Profile>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, p as Profile));

      // Fetch likes and comments counts
      const postIds = postsData.map(p => p.id);
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
      ]);

      const likesCount = new Map<string, number>();
      const commentsCount = new Map<string, number>();
      
      likesRes.data?.forEach(l => {
        likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1);
      });
      commentsRes.data?.forEach(c => {
        commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1);
      });

      // Get user's likes
      const userLikes = new Set<string>();
      if (user) {
        const { data: userLikesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        userLikesData?.forEach(l => userLikes.add(l.post_id));
      }

      const postsWithDetails = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id),
        likes: userLikes.has(post.id) ? [{ user_id: user?.id || '' }] : [],
        _count: {
          likes: likesCount.get(post.id) || 0,
          comments: commentsCount.get(post.id) || 0,
        }
      })) as Post[];
      
      setPosts(postsWithDetails);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
};

export const useUserPosts = (userId: string | undefined) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && postsData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const postIds = postsData.map(p => p.id);
        const [likesRes, commentsRes] = await Promise.all([
          supabase.from('likes').select('post_id').in('post_id', postIds),
          supabase.from('comments').select('post_id').in('post_id', postIds),
        ]);

        const likesCount = new Map<string, number>();
        const commentsCount = new Map<string, number>();
        
        likesRes.data?.forEach(l => {
          likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1);
        });
        commentsRes.data?.forEach(c => {
          commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1);
        });

        const userLikes = new Set<string>();
        if (user) {
          const { data: userLikesData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);
          userLikesData?.forEach(l => userLikes.add(l.post_id));
        }

        const postsWithDetails = postsData.map(post => ({
          ...post,
          profiles: profileData as Profile | undefined,
          likes: userLikes.has(post.id) ? [{ user_id: user?.id || '' }] : [],
          _count: {
            likes: likesCount.get(post.id) || 0,
            comments: commentsCount.get(post.id) || 0,
          }
        })) as Post[];
        
        setPosts(postsWithDetails);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [userId, user]);

  return { posts, loading };
};

export const usePost = (postId: string | undefined) => {
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!postId) {
      setPost(null);
      setLoading(false);
      return;
    }

    const { data: postData, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (!error && postData) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', postData.user_id)
        .maybeSingle();

      const { data: likesData } = await supabase
        .from('likes')
        .select('id, user_id')
        .eq('post_id', postId);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      // Get profiles for comments
      const commentUserIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: commentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', commentUserIds);

      const profilesMap = new Map<string, Profile>();
      commentProfiles?.forEach(p => profilesMap.set(p.user_id, p as Profile));

      const commentsWithProfiles = commentsData?.map(c => ({
        ...c,
        profiles: profilesMap.get(c.user_id),
      }));

      setPost({
        ...postData,
        profiles: profileData as Profile | undefined,
        likes: likesData || [],
        comments: commentsWithProfiles || [],
        _count: {
          likes: likesData?.length || 0,
          comments: commentsData?.length || 0,
        }
      } as Post);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return { post, loading, refetch: fetchPost };
};

export const useCreatePost = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createPost = async (caption: string, mediaUrls: string[], mediaType: string = 'image', location?: string) => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption,
        media_urls: mediaUrls,
        media_type: mediaType,
        location,
      })
      .select()
      .single();

    setLoading(false);
    return { data, error };
  };

  return { createPost, loading };
};
