import { useState, useCallback } from 'react'
import { extractProductFromImage } from '../lib/shopping-api'
import type { ExtractedProduct } from '../lib/shopping-types'

export function useProductExtraction() {
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractFromFile = useCallback(
    async (
      file: File,
      userPrice?: number
    ): Promise<{ product: ExtractedProduct; productId?: string } | null> => {
      setIsExtracting(true)
      setError(null)
      try {
        const base64 = await fileToBase64(file)
        const mediaType = file.type as
          | 'image/jpeg'
          | 'image/png'
          | 'image/webp'
          | 'image/gif'
        const result = await extractProductFromImage(base64, mediaType, userPrice)
        return result
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to extract product'
        setError(message)
        return null
      } finally {
        setIsExtracting(false)
      }
    },
    []
  )

  return { extractFromFile, isExtracting, error }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to get just base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
