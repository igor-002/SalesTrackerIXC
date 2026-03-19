import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UseRealtimeOptions {
  onVenda?: () => void
  onCancelamento?: () => void
}

export function useRealtime({ onVenda, onCancelamento }: UseRealtimeOptions) {
  useEffect(() => {
    const channel = supabase
      .channel('salestracker-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendas' },
        () => onVenda?.()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cancelamentos' },
        () => onCancelamento?.()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onVenda, onCancelamento])
}
