import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Post, Profile } from '@/types/database';
import { useSearchHistory } from '@/hooks/useSearchHistory';

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { history, addSearch, clearHistory, removeSearch } = useSearchHistory();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchExplorePosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchExplorePosts();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        setShowHistory(searchQuery.length === 0 && history.length > 0);
        return;
      }

      setShowHistory(false);
      setIsSearching(true);
      
      // Save search to history
      await addSearch(searchQuery);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);

      if (data) {
        setSearchResults(data as Profile[]);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, addSearch, history.length]);

  const handleSearchFocus = () => {
    if (searchQuery.length === 0 && history.length > 0) {
      setShowHistory(true);
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
    searchInputRef.current?.blur();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-4">
          <Skeleton className="h-10 w-full mb-4" />
          <div className="grid grid-cols-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={searchInputRef}
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowHistory(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search History */}
        {showHistory && history.length > 0 && (
          <div className="mb-4 bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-muted transition-colors group"
                >
                  <button
                    onClick={() => handleHistoryClick(item.query)}
                    className="flex-1 text-left flex items-center gap-3"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.query}</span>
                  </button>
                  <button
                    onClick={() => removeSearch(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="mb-4 bg-card border border-border rounded-lg overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No users found</div>
            ) : (
              searchResults.map((profile) => (
                <Link
                  key={profile.id}
                  to={`/profile/${profile.user_id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>{profile.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{profile.username}</p>
                    {profile.display_name && (
                      <p className="text-sm text-muted-foreground">{profile.display_name}</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Explore Grid */}
        {searchQuery.length < 2 && (
          <>
            <h2 className="font-semibold mb-3">Explore</h2>
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No posts to explore yet
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
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
