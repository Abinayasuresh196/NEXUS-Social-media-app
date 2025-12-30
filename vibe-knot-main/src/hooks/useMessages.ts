import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, Message, Profile } from '@/types/database';

interface ConversationWithDetails extends Conversation {
  other_user: Profile | null;
  last_message: Message | null;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get conversations directly - RLS will automatically filter to user's conversations
    const { data: conversationsData } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!conversationsData || conversationsData.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = conversationsData.map(c => c.id);

    // Get all participants for these conversations
    // With the new policy, we can see all participants in our conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds);

    // Filter to get other participants (not the current user)
    const otherParticipants = allParticipants?.filter(p => p.user_id !== user.id) || [];

    const otherUserIds = otherParticipants?.map(p => p.user_id) || [];
    const { data: otherProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', otherUserIds);

    const profilesMap = new Map<string, Profile>();
    otherProfiles?.forEach(p => profilesMap.set(p.user_id, p as Profile));

    const otherUserByConv = new Map<string, string>();
    otherParticipants?.forEach(p => otherUserByConv.set(p.conversation_id, p.user_id));

    // Get last message for each conversation
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    const lastMessageByConv = new Map<string, Message>();
    allMessages?.forEach(m => {
      if (!lastMessageByConv.has(m.conversation_id)) {
        lastMessageByConv.set(m.conversation_id, m as Message);
      }
    });

    const conversationsWithDetails: ConversationWithDetails[] = (conversationsData || [])
      .map(conv => {
        const otherUserId = otherUserByConv.get(conv.id);
        return {
          ...conv,
          other_user: otherUserId ? profilesMap.get(otherUserId) || null : null,
          last_message: lastMessageByConv.get(conv.id) || null,
        };
      })
      .sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at;
        const bTime = b.last_message?.created_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

    setConversations(conversationsWithDetails);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};

export const useConversation = (conversationId: string | undefined) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Get sender profiles
    const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', senderIds);

    const profilesMap = new Map<string, Profile>();
    senderProfiles?.forEach(p => profilesMap.set(p.user_id, p as Profile));

    const messagesWithProfiles = messagesData?.map(m => ({
      ...m,
      profiles: profilesMap.get(m.sender_id),
    })) as Message[];

    setMessages(messagesWithProfiles || []);

    // Get other participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .maybeSingle();

    if (participant) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', participant.user_id)
        .maybeSingle();
      
      setOtherUser(profileData as Profile | null);
    }

    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  return { messages, otherUser, loading, refetch: fetchMessages };
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const sendMessage = async (conversationId: string, content: string) => {
    if (!user) return { error: new Error('Not authenticated'), data: null };

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    setLoading(false);
    return { data, error };
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return { error: new Error('Not authenticated'), conversationId: null };

    // Check if conversation already exists
    const { data: existingConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingConvs) {
      for (const conv of existingConvs) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (otherParticipant) {
          return { error: null, conversationId: conv.conversation_id };
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (convError || !newConv) {
      return { error: convError, conversationId: null };
    }

    // Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: otherUserId },
    ]);

    return { error: null, conversationId: newConv.id };
  };

  return { sendMessage, startConversation, loading };
};
