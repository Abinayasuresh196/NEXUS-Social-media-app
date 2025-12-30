import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserWithStories, useStories } from '@/hooks/useStories';
import { supabase } from '@/integrations/supabase/client';
import { useSendMessage } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface StoryViewerProps {
  usersWithStories: UserWithStories[];
  initialUserIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

export const StoryViewer = ({
  usersWithStories,
  initialUserIndex,
  onClose,
}: StoryViewerProps) => {
  const { user } = useAuth();
  const { markAsViewed } = useStories();
  const { sendMessage, startConversation } = useSendMessage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const currentUser = usersWithStories[userIndex];
  const currentStory = currentUser?.stories[storyIndex];
  const isOwnStory = currentUser?.user_id === user?.id;

  const goToNextStory = useCallback(() => {
    if (!currentUser) return;

    if (storyIndex < currentUser.stories.length - 1) {
      setStoryIndex((p) => p + 1);
      setProgress(0);
    } else if (userIndex < usersWithStories.length - 1) {
      setUserIndex((p) => p + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentUser, storyIndex, userIndex, usersWithStories.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((p) => p - 1);
      setProgress(0);
    } else if (userIndex > 0) {
      const prevUser = usersWithStories[userIndex - 1];
      setUserIndex((p) => p - 1);
      setStoryIndex(prevUser.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, userIndex, usersWithStories]);

  useEffect(() => {
    if (currentStory && !isOwnStory) {
      markAsViewed(currentStory.id);
    }
  }, [currentStory, markAsViewed, isOwnStory]);

  useEffect(() => {
    if (isPaused || !currentStory) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setTimeout(goToNextStory, 0);
          return 0;
        }
        return p + 100 / (STORY_DURATION / 100);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, currentStory, goToNextStory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextStory();
      if (e.key === 'ArrowLeft') goToPrevStory();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPrevStory, onClose]);

  const handleReply = async () => {
    if (!replyText.trim() || !currentUser || isOwnStory || !user) return;

    setSending(true);
    setIsPaused(true);

    try {
      const { conversationId, error } = await startConversation(
        currentUser.user_id
      );
      if (error || !conversationId) throw error;

      await sendMessage(
        conversationId,
        `💬 Replied to your story:\n"${replyText}"`
      );

      try {
        await supabase.from('notifications').insert({
          user_id: currentUser.user_id,
          actor_id: user.id,
          type: 'story_reply',
        });
      } catch {
        // ignore notification errors
      }

      toast({ title: 'Reply sent!' });
      setReplyText('');
      onClose();
      navigate(`/messages/${conversationId}`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send reply',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setIsPaused(false);
    }
  };

  if (!currentUser || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="relative w-full h-full sm:h-[95vh] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-black flex flex-col overflow-hidden">
        {/* Story Area */}
        <div
          className="relative flex-1"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Progress */}
          <div className="absolute top-0 left-0 right-0 z-10 p-3 flex gap-1">
            {currentUser.stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-white/30 rounded overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width:
                      idx < storyIndex
                        ? '100%'
                        : idx === storyIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-10 px-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-white">
                <AvatarImage src={currentUser.profile.avatar_url || ''} />
                <AvatarFallback>
                  {currentUser.profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-semibold text-sm">
                  {currentUser.profile.username}
                </p>
                <p className="text-xs opacity-70">
                  {formatDistanceToNow(new Date(currentStory.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6 text-white" />
            </Button>
          </div>

          {/* Media */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentStory.media_type === 'video' ? (
              <video
                src={currentStory.media_url}
                autoPlay
                muted
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {/* Arrows */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevStory}
            className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextStory}
            className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex"
          >
          </Button>
        </div>

        {/* Reply */}
        {!isOwnStory && (
          <div className="absolute top-16 left-4 right-4 z-20">
            <div className="flex gap-2 bg-black/80 backdrop-blur-sm border border-white/20 rounded-full p-2">
              <Input
                placeholder={`Reply to ${currentUser.profile.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => !replyText && setIsPaused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                className="bg-white/10 text-white border-white/20 placeholder:text-white/60"
              />
              <Button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                size="icon"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Media */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStory.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              autoPlay
              muted
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {/* Arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevStory}
          className="absolute left-3 top-1/2 -translate-y-1/2 hidden md:flex"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextStory}
          className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </Button>
      </div>
    </div>
  );
};
