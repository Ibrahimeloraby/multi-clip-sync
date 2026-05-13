import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/shopping-api'
import { toast } from 'sonner'

export function useWatchlist() {
  const queryClient = useQueryClient()

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: getWatchlist,
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: ({ productId, notes }: { productId: string; notes?: string }) =>
      addToWatchlist(productId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success('Added to watchlist')
    },
    onError: () => toast.error('Failed to add to watchlist'),
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWatchlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      toast.success('Removed from watchlist')
    },
    onError: () => toast.error('Failed to remove from watchlist'),
  })

  const isWatched = (productId: string) =>
    watchlist.some(w => w.productId === productId)

  return {
    watchlist,
    isLoading,
    addToWatchlist: (productId: string, notes?: string) =>
      addMutation.mutate({ productId, notes }),
    removeFromWatchlist: (productId: string) => removeMutation.mutate(productId),
    isWatched,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  }
}
