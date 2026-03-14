import { 
  useGetCurrentUser, 
  useLogin, 
  useSignup, 
  useLogout, 
  getGetCurrentUserQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), data);
      }
    }
  });

  const signupMutation = useSignup({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), data);
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), { user: null });
        queryClient.clear(); // Clear all other queries (messages, conversations)
      }
    }
  });

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  const user = data?.user ?? null;
  const userWithAvatar = user as typeof user & { avatarUrl?: string | null };

  return {
    user: userWithAvatar,
    isAuthenticated: !!user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refreshUser,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
