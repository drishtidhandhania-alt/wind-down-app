import { useQueryClient } from '@tanstack/react-query';
import {
  getListStarredWindDownSessionsQueryKey,
  useListStarredWindDownSessions,
  useStarWindDownSession,
  useUnstarWindDownSession,
} from '@workspace/api-client-react';

export function useSessionStars(userId?: string) {
  const queryClient = useQueryClient();
  const query = useListStarredWindDownSessions({
    query: {
      enabled: Boolean(userId),
      queryKey: [...getListStarredWindDownSessionsQueryKey(), userId],
    },
  });
  const starMutation = useStarWindDownSession({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getListStarredWindDownSessionsQueryKey(),
        }),
    },
  });
  const unstarMutation = useUnstarWindDownSession({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getListStarredWindDownSessionsQueryKey(),
        }),
    },
  });

  const toggle = (sessionId: string, isStarred: boolean) => {
    starMutation.reset();
    unstarMutation.reset();
    if (isStarred) {
      unstarMutation.mutate({ sessionId });
    } else {
      starMutation.mutate({ sessionId });
    }
  };

  return {
    query,
    isStarred: (sessionId: string) =>
      query.data?.some((session) => session.id === sessionId) ?? false,
    toggle,
    isPending: starMutation.isPending || unstarMutation.isPending,
    actionError: starMutation.isError || unstarMutation.isError,
  };
}
