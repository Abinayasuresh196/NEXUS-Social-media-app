import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Comment } from '@/types/database';

type LikeData = {
  id: string;
  user_id: string;
  post_id: string;
  comment_id?: string;
  created_at: string;
};

type LikeResult = {
  error: Error | null;
  data?: LikeData | null;
};

export const useLike = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const toggleLike = async (postId: string, isLiked: boolean, commentId?: string): Promise<LikeResult> => {
    if (!user) return { error: new Error('Not authenticated') };

    setLoading(true);
    
    if (isLiked) {
      if (commentId) {
        // Remove comment like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .eq('comment_id', commentId);
        setLoading(false);
        return { error: deleteError ? new Error(deleteError.message) : null };
      } else {
        // Remove post like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        setLoading(false);
        return { error: deleteError ? new Error(deleteError.message) : null };
      }
    } else {
      if (commentId) {
        // Add comment like
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId, comment_id: commentId });
        
        if (!error) {
          // Create notification for comment owner
          console.log('Creating comment like notification for comment:', commentId);
          try {
            const { data: comment } = await supabase
              .from('comments')
              .select('user_id, post_id')
              .eq('id', commentId)
              .single();
            
            console.log('Comment owner data:', comment);
            
            if (comment && comment.user_id !== user.id) {
              console.log('Creating notification for user:', comment.user_id, 'from user:', user.id);
              const { error: notifError, data: notifData } = await supabase.from('notifications').insert({
                user_id: comment.user_id,
                actor_id: user.id,
                type: 'like',
                post_id: comment.post_id,
                comment_id: commentId,
              }).select('*').single();
              
              console.log('Comment like notification creation result:', { notifError, notifData });
              
              if (notifError) {
                console.error('Failed to create comment like notification:', notifError);
                toast({ 
                  title: 'Warning', 
                  description: 'Comment like saved but notification failed',
                  variant: 'default'
                });
              } else {
                console.log('Comment like notification created successfully');
              }
            } else {
              console.log('Not creating notification - user liked their own comment or comment not found');
            }
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Failed to create comment like notification:', error);
          }
        }

        setLoading(false);
        return { error: error ? new Error(error.message) : null };
      } else {
        // Add post like
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId });
        
        if (!insertError) {
          // Create notification for post owner
          console.log('Creating like notification for post:', postId);
          try {
            const { data: post } = await supabase
              .from('posts')
              .select('user_id')
              .eq('id', postId)
              .single();
            
            console.log('Post owner data:', post);
            
            if (post && post.user_id !== user.id) {
              console.log('Creating notification for user:', post.user_id, 'from user:', user.id);
              const { error: notifError, data: notifData } = await supabase.from('notifications').insert({
                user_id: post.user_id,
                actor_id: user.id,
                type: 'like',
                post_id: postId,
              }).select('*').single();
              
              console.log('Notification creation result:', { notifError, notifData });
              
              if (notifError) {
                console.error('Failed to create like notification:', notifError);
                toast({ 
                  title: 'Warning', 
                  description: 'Like saved but notification failed',
                  variant: 'default'
                });
              } else {
                console.log('Like notification created successfully');
              }
            } else {
              console.log('Not creating notification - user liked their own post or post not found');
            }
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error('Failed to create like notification:', error);
          }
        }

        setLoading(false);
        return { error: insertError ? new Error(insertError.message) : null };
      }
    }
  };

  const isLikedByUser = (likes: { user_id: string }[] | undefined) => {
    if (!user || !likes) return false;
    return likes.some(like => like.user_id === user.id);
  };

  return { 
    toggleLike, 
    isLikedByUser, 
    loading 
  };
};

export const useComment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Test function to verify database connectivity
  const testConnection = async () => {
    console.log('Testing database connection...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      console.log('Database test result:', { data, error });
      return { success: !error, error };
    } catch (err) {
      console.error('Database test failed:', err);
      return { success: false, error: err };
    }
  };

  // Test function to directly fetch comments for a post
  const testFetchComments = async (postId: string) => {
    console.log('Testing direct comment fetch for post:', postId);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      console.log('Direct comment fetch result:', { data, error, count: data?.length });
      return { data, error, success: !error };
    } catch (err) {
      console.error('Direct comment fetch failed:', err);
      return { success: false, error: err, data: null };
    }
  };

  // Test function to try fetching comments with different approaches
  const testCommentFetchMethods = async (postId: string) => {
    console.log('Testing multiple comment fetch methods for post:', postId);
    
    const results = {
      direct: { success: false, data: null, error: null },
      withProfiles: { success: false, data: null, error: null },
      countOnly: { success: false, data: null, error: null }
    };

    // Method 1: Direct fetch
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId);
      
      results.direct = { success: !error, data, error };
      console.log('Method 1 - Direct fetch:', { data, error, count: data?.length });
    } catch (err) {
      results.direct.error = err;
      console.error('Method 1 failed:', err);
    }

    // Method 2: With profiles (embedded)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (*)
        `)
        .eq('post_id', postId);
      
      results.withProfiles = { success: !error, data, error };
      console.log('Method 2 - With profiles:', { data, error, count: data?.length });
    } catch (err) {
      results.withProfiles.error = err;
      console.error('Method 2 failed:', err);
    }

    // Method 3: Count only
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('count')
        .eq('post_id', postId);
      
      results.countOnly = { success: !error, data, error };
      console.log('Method 3 - Count only:', { data, error });
    } catch (err) {
      results.countOnly.error = err;
      console.error('Method 3 failed:', err);
    }

    return results;
  };

  const addComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    setLoading(true);
    
    console.log('Attempting to add comment:', { postId, content, userId: user.id });
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        post_id: postId,
        content,
        parent_id: parentId || null,
      })
      .select('*')
      .single();

    console.log('Comment insert result:', { data, error });

    // Fetch profile data separately to avoid RLS issues with embedded relationships
    if (!error && data) {
      console.log('Comment inserted successfully, fetching profile...');
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('Profile data:', profileData);
      
      const commentWithProfile = data as Comment;
      commentWithProfile.profiles = profileData;
      return { data: commentWithProfile, error };
    } else {
      console.error('Failed to insert comment:', error);
      return { data, error };
    }

    if (!error) {
      // Create notification for post owner
      console.log('Creating comment notification for post:', postId);
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();
        
        console.log('Post owner data:', post);
        
        if (post && post.user_id !== user.id) {
          console.log('Creating comment notification for user:', post.user_id, 'from user:', user.id);
          const { error: notifError, data: notifData } = await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: user.id,
            type: 'comment',
            post_id: postId,
            comment_id: data.id,
          }).select('*').single();
          
          console.log('Comment notification creation result:', { notifError, notifData });
          
          if (notifError) {
            console.error('Failed to create comment notification:', notifError);
          } else {
            console.log('Comment notification created successfully');
          }
        } else {
          console.log('Not creating notification - user commented on their own post or post not found');
        }
      } catch (err) {
        console.error('Failed to create comment notification:', err);
      }
    }

    setLoading(false);
    return { data, error };
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    return { error };
  };

  // Test function to create a sample notification (for testing)
  const createTestNotification = async () => {
    if (!user) return { error: new Error('Not authenticated'), data: null };
    
    console.log('Creating test notification...');
    try {
      const { data, error } = await supabase.from('notifications').insert({
        user_id: user.id, // Send to self for testing
        actor_id: user.id,
        type: 'like',
        read: false,
        post_id: null, // No post_id to avoid recursion
      }).select('*').single();
      
      console.log('Test notification created:', { data, error });
      return { data, error };
    } catch (err) {
      console.error('Failed to create test notification:', err);
      return { error: err, data: null };
    }
  };

  return { addComment, deleteComment, testConnection, testFetchComments, testCommentFetchMethods, createTestNotification, loading };
};

export const useFollow = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const toggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!user) return { error: new Error('Not authenticated') };

    setLoading(true);
    
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      setLoading(false);
      return { error };
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });
      
      if (!error) {
        // Create notification
        console.log('Creating follow notification for user:', targetUserId, 'from user:', user.id);
        try {
          const { error: notifError, data: notifData } = await supabase.from('notifications').insert({
            user_id: targetUserId,
            actor_id: user.id,
            type: 'follow',
          }).select('*').single();
          
          console.log('Follow notification creation result:', { notifError, notifData });
          
          if (notifError) {
            console.error('Failed to create follow notification:', notifError);
          } else {
            console.log('Follow notification created successfully');
          }
        } catch (err) {
          console.error('Failed to create follow notification:', err);
        }
      }
      
      setLoading(false);
      return { error };
    }
  };

  const checkFollowing = async (targetUserId: string) => {
    if (!user) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    return !!data;
  };

  return { toggleFollow, checkFollowing, loading };
};

export const useBookmark = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const toggleBookmark = async (postId: string, isBookmarked: boolean) => {
    if (!user) return { error: new Error('Not authenticated') };

    setLoading(true);
    
    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
      setLoading(false);
      return { error };
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, post_id: postId });
      setLoading(false);
      return { error };
    }
  };

  return { toggleBookmark, loading };
};
