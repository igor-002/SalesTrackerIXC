import { useState, useCallback } from 'react'
import type { FocusEvent } from 'react'
import { ixcConfigurado } from '@/lib/ixc'

interface UseIxcFieldLookupOptions<T> {
  fetcher: (value: string) => Promise<T>
  onSuccess: (result: T) => void
  onError?: (err: unknown) => void
}

interface UseIxcFieldLookupReturn {
  loading: boolean
  handleBlur: (e: FocusEvent<HTMLInputElement>) => void
}

export function useIxcFieldLookup<T>({
  fetcher,
  onSuccess,
  onError,
}: UseIxcFieldLookupOptions<T>): UseIxcFieldLookupReturn {
  const [loading, setLoading] = useState(false)

  const handleBlur = useCallback(
    async (e: FocusEvent<HTMLInputElement>) => {
      const value = e.target.value.trim()
      if (!value || !ixcConfigurado()) return

      setLoading(true)
      try {
        const result = await fetcher(value)
        onSuccess(result)
      } catch (err) {
        onError?.(err)
      } finally {
        setLoading(false)
      }
    },
    [fetcher, onSuccess, onError]
  )

  return { loading, handleBlur }
}
