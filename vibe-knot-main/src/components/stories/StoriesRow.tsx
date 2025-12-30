import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useStories, UserWithStories } from '@/hooks/useStories';
import { StoryViewer } from './StoryViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const StoriesRow = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { usersWithStories, myStories, createStory, fetchStories } = useStories();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleAddStory = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload file');
      }

      // For private buckets, getPublicUrl still works but requires authentication
      // The URL will be accessible to authenticated users
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const result = await createStory(publicUrl, mediaType);

      if (result?.error) {
        throw result.error;
      }

      toast({ title: 'Story added!' });
      fetchStories();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload story',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openStoryViewer = (index: number) => {
    setSelectedUserIndex(index);
    setViewerOpen(true);
  };

  const hasMyStory = myStories.length > 0;
  const myStoryIndex = usersWithStories.findIndex(u => u.user_id === user?.id);

  return (
    <>
      <div className="flex gap-3 md:gap-4 p-4 md:p-6 overflow-x-auto scrollbar-hide border-b border-border bg-card">
        {/* Add Story / My Story */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={hasMyStory && myStoryIndex >= 0 ? () => openStoryViewer(myStoryIndex) : handleAddStory}
            disabled={uploading}
            className="relative"
          >
            <div className={cn(
              'w-14 h-14 md:w-16 md:h-16 rounded-full p-[2px]',
              hasMyStory ? 'bg-gradient-to-tr from-primary to-accent-foreground' : 'bg-muted'
            )}>
              <div className="w-full h-full rounded-full bg-card p-[2px]">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {profile?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            {!hasMyStory && (
              <div className="absolute bottom-0 right-0 w-4 h-4 md:w-5 md:h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                <Plus className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary-foreground" />
              </div>
            )}
          </button>
          <span className="text-xs text-muted-foreground truncate w-14 md:w-16 text-center">
            {uploading ? 'Adding...' : 'Your story'}
          </span>
        </div>

        {/* Other Users' Stories */}
        {usersWithStories
          .filter(u => u.user_id !== user?.id)
          .map((userWithStoriesItem, idx) => {
            // Find the index in the original full array
            const fullArrayIndex = usersWithStories.findIndex(u => u.user_id === userWithStoriesItem.user_id);
            
            return (
              <div key={userWithStoriesItem.user_id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <button onClick={() => {
                  // Use the index from the full array
                  openStoryViewer(fullArrayIndex >= 0 ? fullArrayIndex : idx + 1);
                }}>
                  <div className={cn(
                    'w-14 h-14 md:w-16 md:h-16 rounded-full p-[2px]',
                    userWithStoriesItem.hasUnviewed
                      ? 'bg-gradient-to-tr from-primary to-accent-foreground'
                      : 'bg-muted'
                  )}>
                    <div className="w-full h-full rounded-full bg-card p-[2px]">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={userWithStoriesItem.profile?.avatar_url || ''} />
                        <AvatarFallback>
                          {userWithStoriesItem.profile?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </button>
                <span className="text-xs text-muted-foreground truncate w-14 md:w-16 text-center">
                  {userWithStoriesItem.profile?.username || 'User'}
                </span>
              </div>
            );
          })}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Story Viewer Modal */}
      {viewerOpen && usersWithStories.length > 0 && (
        <StoryViewer
          usersWithStories={usersWithStories}
          initialUserIndex={selectedUserIndex}
          onClose={() => {
            setViewerOpen(false);
            fetchStories();
          }}
        />
      )}
    </>
  );
};
