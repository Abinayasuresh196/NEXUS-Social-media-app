import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Grid, MessageCircle, MoreHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileById, useProfile } from '@/hooks/useProfile';
import { useFollowStats } from '@/hooks/useFollowStats';
import { useUserPosts } from '@/hooks/usePosts';
import { useFollow } from '@/hooks/useSocialActions';
import { useSendMessage } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { profile, loading: profileLoading } = useProfileById(userId);
  const { profile: myProfile, updateProfile } = useProfile();
  const { stats, loading: statsLoading } = useFollowStats(userId);
  const { posts, loading: postsLoading } = useUserPosts(userId);
  const { toggleFollow, checkFollowing, loading: followLoading } = useFollow();
  const { startConversation } = useSendMessage();

  const [isFollowing, setIsFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    website: '',
  });

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && userId && !isOwnProfile) {
      checkFollowing(userId).then(setIsFollowing);
    }
  }, [user, userId, isOwnProfile, checkFollowing]);

  useEffect(() => {
    if (myProfile && isOwnProfile) {
      setEditForm({
        display_name: myProfile.display_name || '',
        bio: myProfile.bio || '',
        website: myProfile.website || '',
      });
    }
  }, [myProfile, isOwnProfile]);

  const handleFollow = async () => {
    if (!userId) return;
    setIsFollowing(!isFollowing);
    await toggleFollow(userId, isFollowing);
  };

  const handleMessage = async () => {
    if (!userId) return;
    try {
      const { conversationId, error } = await startConversation(userId);
      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to start conversation', variant: 'destructive' });
        return;
      }
      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile(editForm);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
      setEditOpen(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Error', description: uploadError.message, variant: 'destructive' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
    await updateProfile({ avatar_url: publicUrl });
    toast({ title: 'Avatar updated' });
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="p-8 text-center text-muted-foreground">
          User not found
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-6">
          <div className="relative">
            <Avatar className="h-20 w-20 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="text-2xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <Settings className="h-4 w-4" />
              </label>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <h1 className="text-xl font-semibold">{profile.username}</h1>
              {isOwnProfile ? (
                <div className="flex gap-2 ml-auto">
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Edit Profile</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Display Name</Label>
                          <Input
                            value={editForm.display_name}
                            onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Bio</Label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Website</Label>
                          <Input
                            value={editForm.website}
                            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleSaveProfile} className="w-full">Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => signOut()}>
                        Log Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant={isFollowing ? 'outline' : 'default'}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={handleMessage}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {}}>
                        Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {}}>
                        Block
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm mb-4">
              <span><strong>{stats.posts}</strong> posts</span>
              <span><strong>{stats.followers}</strong> followers</span>
              <span><strong>{stats.following}</strong> following</span>
            </div>

            {/* Bio */}
            <div className="text-sm">
              <p className="font-semibold">{profile.display_name}</p>
              {profile.bio && <p className="mt-1">{profile.bio}</p>}
              {profile.website && (
                <a href={profile.website} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {profile.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-center mb-4">
            <Button variant="ghost" size="sm" className="gap-2">
              <Grid className="h-4 w-4" />
              Posts
            </Button>
          </div>

          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="aspect-square bg-muted overflow-hidden hover:opacity-80 transition-opacity"
                >
                  {post.media_urls?.[0] ? (
                    <img
                      src={post.media_urls[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
