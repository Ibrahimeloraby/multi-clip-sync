import React, { useCallback, useState, useRef } from 'react'
import { Upload, ImageIcon, X, Camera } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface Props {
  onFileSelected: (file: File) => void
  isLoading?: boolean
  preview?: string | null
  onClear?: () => void
}

export function ScreenshotUpload({ onFileSelected, isLoading, preview, onClear }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) onFileSelected(file)
          break
        }
      }
    },
    [onFileSelected]
  )

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-border bg-card">
        <img
          src={preview}
          alt="Product screenshot"
          className="w-full max-h-80 object-contain bg-muted"
        />
        {onClear && (
          <button
            onClick={onClear}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      onClick={() => fileInputRef.current?.click()}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragging
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </div>

        <div>
          <p className="font-semibold text-foreground text-lg">
            {isLoading ? 'Analyzing product...' : 'Drop your screenshot here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Paste (Ctrl+V), drag & drop, or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Supports PNG, JPG, WebP</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={e => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <ImageIcon className="w-4 h-4" />
            Choose File
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={e => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>
        </div>
      </div>
    </div>
  )
}
