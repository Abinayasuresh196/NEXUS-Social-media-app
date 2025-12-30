import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, PenSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
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
          <h1 className="text-xl font-semibold">Messages</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/explore')}>
            <PenSquare className="h-5 w-5" />
          </Button>
        </header>

        {conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start a conversation by visiting someone's profile</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/explore')}>
              Find People
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/messages/${conversation.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={conversation.other_user?.avatar_url || ''} />
                  <AvatarFallback>
                    {conversation.other_user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {conversation.other_user?.username || 'Unknown User'}
                  </p>
                  <p className={cn(
                    'text-sm truncate',
                    conversation.last_message && !conversation.last_message.read_at && 
                    conversation.last_message.sender_id !== user?.id
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  )}>
                    {conversation.last_message?.content || 'No messages yet'}
                  </p>
                </div>

                {conversation.last_message && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: false })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Messages;
