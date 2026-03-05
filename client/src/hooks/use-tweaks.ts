import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTweaks, updateTweak } from "@/lib/api";
import type { Tweak } from "@shared/schema";

export function useTweaks() {
  return useQuery<Tweak[]>({
    queryKey: ["/api/tweaks"],
    queryFn: getTweaks,
  });
}

export function useUpdateTweak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateTweak(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tweaks"] });
      const prev = queryClient.getQueryData<Tweak[]>(["/api/tweaks"]);
      queryClient.setQueryData<Tweak[]>(["/api/tweaks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, isActive } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["/api/tweaks"], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tweaks"] });
    },
  });
}
