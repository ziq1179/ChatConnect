import { useQueryClient } from "@tanstack/react-query";
import {
  useListConversations,
  useCreateConversation,
  useGetConversation,
  useListMessages,
  useSendMessage,
  useSearchUsers,
  getListConversationsQueryKey,
  getListMessagesQueryKey,
  getGetConversationQueryKey,
} from "@workspace/api-client-react";

export function useAppConversations() {
  return useListConversations({
    query: {
      refetchInterval: 5000, // Poll occasionally for new conversations
      staleTime: 1000 * 60,
    }
  });
}

export function useAppConversation(id: number) {
  return useGetConversation(id, {
    query: {
      enabled: !!id && !isNaN(id),
    }
  });
}

export function useAppMessages(conversationId: number) {
  return useListMessages(conversationId, {
    query: {
      enabled: !!conversationId && !isNaN(conversationId),
      refetchInterval: 3000, // Fast polling for real-time feel
    }
  });
}

export function useAppCreateConversation() {
  const queryClient = useQueryClient();
  return useCreateConversation({
    mutation: {
      onSuccess: (newConv) => {
        // Invalidate conversation list
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        // Optimistically set the newly fetched conversation
        queryClient.setQueryData(getGetConversationQueryKey(newConv.id), newConv);
      },
    },
  });
}

export function useAppSendMessage() {
  const queryClient = useQueryClient();
  return useSendMessage({
    mutation: {
      onSuccess: (newMessage, variables) => {
        const { conversationId } = variables;
        // Invalidate specific message list
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
        // Also invalidate conversation list so lastMessage updates
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
    },
  });
}

export function useAppSearchUsers(q: string) {
  return useSearchUsers({ q }, {
    query: {
      enabled: q.length >= 2,
      staleTime: 1000 * 60 * 5,
    }
  });
}
