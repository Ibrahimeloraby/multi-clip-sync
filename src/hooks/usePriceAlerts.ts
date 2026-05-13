import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, setAlert, deleteAlert, getTriggeredAlerts } from '../lib/shopping-api'
import type { PriceAlert } from '../lib/shopping-types'
import { toast } from 'sonner'

export function usePriceAlerts(productId?: string) {
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', productId],
    queryFn: () => getAlerts(productId),
    staleTime: 60_000,
  })

  const { data: triggeredAlerts = [] } = useQuery({
    queryKey: ['triggered-alerts'],
    queryFn: getTriggeredAlerts,
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (
      alert: Omit<PriceAlert, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggerCount'>
    ) => setAlert(alert),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success("Price alert set! We'll notify you when the price drops.")
    },
    onError: () => toast.error('Failed to set alert'),
  })

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert removed')
    },
    onError: () => toast.error('Failed to remove alert'),
  })

  return {
    alerts,
    triggeredAlerts,
    isLoading,
    createAlert: (
      alert: Omit<PriceAlert, 'id' | 'createdAt' | 'lastTriggeredAt' | 'triggerCount'>
    ) => createMutation.mutate(alert),
    deleteAlert: (alertId: string) => deleteMutation.mutate(alertId),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
