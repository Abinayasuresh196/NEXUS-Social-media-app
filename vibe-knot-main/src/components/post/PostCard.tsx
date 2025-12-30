import { useState } from 'react';
import { Heart, MessageCircle, Bookmark, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/types/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLike, useBookmark } from '@/hooks/useSocialActions';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  onLikeChange?: () => void;
}

export const PostCard = ({ post, onLikeChange }: PostCardProps) => {
  const { user } = useAuth();
  const { toggleLike, isLikedByUser } = useLike();
  const { toggleBookmark } = useBookmark();
  const [isLiked, setIsLiked] = useState(isLikedByUser(post.likes));
  const [likeCount, setLikeCount] = useState(typeof post._count?.likes === 'number' ? post._count?.likes : 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    
    setIsLikeAnimating(true);
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    await toggleLike(post.id, isLiked);
    onLikeChange?.();
    
    setTimeout(() => setIsLikeAnimating(false), 300);
  };

  const handleBookmark = async () => {
    if (!user) return;
    setIsBookmarked(!isBookmarked);
    await toggleBookmark(post.id, isBookmarked);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  return (
    <article className="border-b border-border bg-card">
      {/* Header */}
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
      <div 
        className="relative aspect-square bg-muted cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        {post.media_urls?.[0] ? (
          post.media_type === 'video' ? (
            <video
              src={post.media_urls[0]}
              className="w-full h-full object-cover"
              controls
            />
          ) : (
            <img
              src={post.media_urls[0]}
              alt={post.caption || 'Post'}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No media
          </div>
        )}
        
        {/* Like animation overlay */}
        {isLikeAnimating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="h-24 w-24 text-destructive fill-destructive animate-ping" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleLike}>
              <Heart className={cn(
                'h-6 w-6 transition-colors',
                isLiked ? 'text-destructive fill-destructive' : ''
              )} />
            </Button>
            <Link to={`/post/${post.id}`}>
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-6 w-6" />
              </Button>
            </Link>
          </div>
          <Button variant="ghost" size="icon" onClick={handleBookmark}>
            <Bookmark className={cn(
              'h-6 w-6',
              isBookmarked ? 'fill-foreground' : ''
            )} />
          </Button>
        </div>

        {/* Likes count */}
        <p className="font-semibold text-sm mb-1">{likeCount} likes</p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <Link to={`/profile/${post.user_id}`} className="font-semibold mr-2">
              {post.profiles?.username}
            </Link>
            {post.caption}
          </p>
        )}

        {/* Comments preview */}
        {((typeof post._count?.comments === 'number' ? post._count?.comments : 0) || 0) > 0 && (
          <Link to={`/post/${post.id}`} className="text-sm text-muted-foreground mt-1 block">
            View all {(typeof post._count?.comments === 'number' ? post._count?.comments : 0)} comments
          </Link>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1 uppercase">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>
    </article>
  );
};
