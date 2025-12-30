import { useNotifications, type NotificationWithDetails } from '@/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, User, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export const NotificationList = () => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <User className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-500 rounded-full" />;
    }
  };

  const getNotificationText = (notification: NotificationWithDetails) => {
    const actor = notification.actor;
    const post = notification.post;
    
    switch (notification.type) {
      case 'like':
        return (
          <>
            <strong>{actor?.username || 'Someone'}</strong> liked your post
            {post && (
              <Link to={`/post/${post.id}`} className="text-blue-500 hover:underline ml-1">
                {post.caption ? `"${post.caption.slice(0, 50)}"` : 'Untitled'}
              </Link>
            )}
          </>
        );
      case 'comment':
        return (
          <>
            <strong>{actor?.username || 'Someone'}</strong> commented on your post
            {post && (
              <Link to={`/post/${post.id}`} className="text-blue-500 hover:underline ml-1">
                {post.caption ? `"${post.caption.slice(0, 50)}"` : 'Untitled'}
              </Link>
            )}
          </>
        );
      case 'follow':
        return (
          <>
            <strong>{actor?.username || 'Someone'}</strong> started following you
          </>
        );
      default:
        return (
          <>
            <strong>{actor?.username || 'Someone'}</strong> interacted with your content
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="text-center">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Notifications {unreadCount > 0 && <span className="text-blue-500">({unreadCount})</span>}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No notifications yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-colors ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={notification.actor?.avatar_url || ''} />
                    <AvatarFallback>
                      {notification.actor?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {getNotificationText(notification)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!notification.read ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    ) : (
                      <CheckCheck className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
