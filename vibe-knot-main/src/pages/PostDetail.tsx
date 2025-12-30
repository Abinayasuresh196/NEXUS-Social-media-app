import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MoreHorizontal, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { usePost } from '@/hooks/usePosts';
import { useLike, useComment } from '@/hooks/useSocialActions';
import { cn } from '@/lib/utils';
import { Comment } from '@/types/database';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { post, loading, refetch } = usePost(postId);
  const { toggleLike, isLikedByUser } = useLike();
  const { addComment, loading: commentLoading } = useComment();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (post) {
      setIsLiked(isLikedByUser(post.likes));
      setLikeCount(typeof post._count?.likes === 'number' ? post._count?.likes : 0);
      setComments((post.comments || []) as Comment[]);
    }
  }, [post, isLikedByUser]);

  const handleLike = async () => {
    if (!post) return;
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    await toggleLike(post.id, isLiked);
  };

  const handleComment = async () => {
    if (!newComment.trim() || !postId) return;
    
    const { data, error } = await addComment(postId, newComment);
    if (!error && data) {
      setComments(prev => [...prev, data as Comment]);
      setNewComment('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="p-4 border-b border-border">
          <Skeleton className="h-6 w-24" />
        </header>
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border p-4 z-40 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Post</h1>
      </header>

      {/* Post Content */}
      <article>
        {/* User Header */}
        <div className="flex items-center justify-between p-3">
          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.profiles?.avatar_url || ''} />
              <AvatarFallback>{post.profiles?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <span className="font-semibold text-sm">{post.profiles?.username}</span>
              {post.location && (
                <p className="text-xs text-muted-foreground">{post.location}</p>
              )}
            </div>
          </Link>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Media */}
        <div className="aspect-square bg-muted">
          {post.media_urls?.[0] ? (
            post.media_type === 'video' ? (
              <video src={post.media_urls[0]} className="w-full h-full object-cover" controls />
            ) : (
              <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No media
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3">
          <Button variant="ghost" size="icon" onClick={handleLike}>
            <Heart className={cn(
              'h-6 w-6',
              isLiked ? 'text-destructive fill-destructive' : ''
            )} />
          </Button>
          <p className="font-semibold text-sm mt-1">{likeCount} likes</p>

          {/* Caption */}
          {post.caption && (
            <p className="text-sm mt-2">
              <Link to={`/profile/${post.user_id}`} className="font-semibold mr-2">
                {post.profiles?.username}
              </Link>
              {post.caption}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-2 uppercase">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </article>

      {/* Comments */}
      <div className="border-t border-border">
        <div className="p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Link to={`/profile/${comment.user_id}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url || ''} />
                    <AvatarFallback>{comment.profiles?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <p className="text-sm">
                    <Link to={`/profile/${comment.user_id}`} className="font-semibold mr-2">
                      {comment.profiles?.username}
                    </Link>
                    {comment.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleComment()}
            />
            <Button onClick={handleComment} disabled={commentLoading || !newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
