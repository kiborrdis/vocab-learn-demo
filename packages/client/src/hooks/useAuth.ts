import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/api";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: number } | null;
  error: string | null;
}

export const useAuth = (): AuthState => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth", "identity"],
    queryFn: async () => {
      try {
        const result = await apiClient.get_identity();

        if (result[0] !== 200) {
          throw new Error(result[1].error || "Failed to fetch identity");
        }

        return result[1];
      } catch {
        // 401 or other auth errors mean not authenticated
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    isAuthenticated: !!data,
    isLoading,
    user: data || null,
    error: error?.message || null,
  };
};

export const useAuthActions = () => {
  const queryClient = useQueryClient();

  const clearAuth = () => {
    queryClient.setQueryData(["auth", "identity"], null);
    queryClient.invalidateQueries({ queryKey: ["auth"] });
  };

  const refreshAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["auth", "identity"] });
  };

  return {
    clearAuth,
    refreshAuth,
  };
};
