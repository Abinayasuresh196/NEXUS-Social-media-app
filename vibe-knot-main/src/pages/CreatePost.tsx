import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Video, X, MapPin, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePost } from '@/hooks/usePosts';
import { supabase } from '@/integrations/supabase/client';

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { createPost, loading: creating } = useCreatePost();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.slice(0, 10 - mediaFiles.length);
    setMediaFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one image or video', variant: 'destructive' });
      return;
    }

    if (!user) return;

    setUploading(true);

    try {
      // Upload files
      const mediaUrls: string[] = [];
      let mediaType = 'image';

      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/posts/${fileName}`;

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

        // Get public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);
        
        mediaUrls.push(publicUrl);

        // Check if any file is a video
        if (file.type.startsWith('video/')) {
          mediaType = 'video';
        }
      }

      // Determine media type based on uploaded files
      // If any file is a video, set media type to video
      const hasVideo = mediaFiles.some(file => file.type.startsWith('video/'));
      const finalMediaType = hasVideo ? 'video' : 'image';

      // Create post
      const { error } = await createPost(caption, mediaUrls, finalMediaType, location || undefined);

      if (error) {
        throw error;
      }

      toast({ title: 'Post created!' });
      navigate('/');
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create post',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const isLoading = uploading || creating;

  return (
    <MainLayout>
      <div className="p-4">
        <header className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <h1 className="font-semibold">New Post</h1>
          <Button onClick={handleSubmit} disabled={isLoading || mediaFiles.length === 0}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
          </Button>
        </header>

        {/* Media Preview */}
        {mediaPreviews.length > 0 ? (
          <div className="relative mb-4">
            <div className="grid grid-cols-2 gap-2">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  {mediaFiles[index]?.type.startsWith('video/') ? (
                    <video src={preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {mediaPreviews.length < 10 && (
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Add More
              </Button>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors mb-4"
          >
            <div className="flex gap-4 mb-4">
              <Image className="h-12 w-12 text-muted-foreground" />
              <Video className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Tap to add photos or videos</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Caption */}
        <Textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mb-4 min-h-[100px] resize-none"
        />

        {/* Location */}
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Add location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default CreatePost;
