import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Check, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-destructive fill-destructive" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'story_reply':
        return <MessageSquare className="h-4 w-4 text-accent-foreground" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  const getNotificationText = (type: string, actorUsername: string) => {
    switch (type) {
      case 'like':
        return <><strong>{actorUsername}</strong> liked your post</>;
      case 'comment':
        return <><strong>{actorUsername}</strong> commented on your post</>;
      case 'follow':
        return <><strong>{actorUsername}</strong> started following you</>;
      case 'mention':
        return <><strong>{actorUsername}</strong> mentioned you</>;
      case 'story_reply':
        return <><strong>{actorUsername}</strong> replied to your story</>;
      default:
        return <><strong>{actorUsername}</strong> interacted with you</>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </header>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-sm">When someone interacts with your posts, you'll see it here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                  if (notification.type === 'story_reply') {
                    navigate('/messages');
                  } else if (notification.post_id) {
                    navigate(`/post/${notification.post_id}`);
                  } else if (notification.type === 'follow') {
                    navigate(`/profile/${notification.actor_id}`);
                  }
                }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  notification.read ? 'bg-transparent' : 'bg-accent'
                )}
              >
                <Link to={`/profile/${notification.actor_id}`} onClick={(e) => e.stopPropagation()}>
                  <Avatar>
                    <AvatarImage src={notification.actor?.avatar_url || ''} />
                    <AvatarFallback>
                      {notification.actor?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(notification.type)}
                    <p className="text-sm truncate">
                      {getNotificationText(notification.type, notification.actor?.username || 'Someone')}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>

                {notification.post?.media_urls?.[0] && (
                  <img
                    src={notification.post.media_urls[0]}
                    alt=""
                    className="h-12 w-12 object-cover rounded"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
