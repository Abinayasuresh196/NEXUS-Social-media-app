import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SearchHistory } from '@/types/database';

export const useSearchHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addSearch = useCallback(async (query: string) => {
    if (!user || !query.trim() || query.length < 2) return;

    // Don't save duplicate recent searches
    const recentDuplicate = history.find(
      (item) => item.query.toLowerCase() === query.toLowerCase() &&
      new Date().getTime() - new Date(item.created_at).getTime() < 60000 // Within 1 minute
    );

    if (recentDuplicate) return;

    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: user.id,
        query: query.trim(),
      });

    if (!error) {
      fetchHistory();
    }
  }, [user, history, fetchHistory]);

  const clearHistory = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setHistory([]);
    }
  }, [user]);

  const removeSearch = useCallback(async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (!error) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  }, [user]);

  return {
    history,
    loading,
    addSearch,
    clearHistory,
    removeSearch,
    refetch: fetchHistory,
  };
};

