import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { StoriesRow } from '@/components/stories/StoriesRow';
import { PostCard } from '@/components/post/PostCard';
import { useFeedPosts } from '@/hooks/usePosts';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { posts = [], loading, refetch } = useFeedPosts();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="p-4 space-y-4">
          <div className="flex gap-4 overflow-x-auto">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full flex-shrink-0" />
            ))}
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="aspect-square w-full" />
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  // Ensure posts is an array before mapping
  const safePosts = Array.isArray(posts) ? posts : [];

  return (
    <MainLayout>
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border p-4 z-40 md:hidden">
        <h1 className="text-2xl font-serif font-bold text-primary">Nexus</h1>
      </header>

      {/* Stories Row */}
      <StoriesRow />
      
      {/* Posts Feed */}
      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="aspect-square w-full" />
              </div>
            ))}
          </div>
        ) : safePosts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-lg mb-2">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        ) : (
          safePosts.map((post) => (
            post && post.id ? (
              <PostCard key={post.id} post={post} onLikeChange={refetch} />
            ) : null
          ))
        )}
      </div>
    </MainLayout>
  );
};

export default Index;
