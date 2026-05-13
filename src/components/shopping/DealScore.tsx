import { cn } from '../../lib/utils'

interface Props {
  score: 'A' | 'B' | 'C' | 'D'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const CONFIG = {
  A: {
    label: 'Excellent Deal',
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-500',
    light: 'bg-green-50 text-green-700',
  },
  B: {
    label: 'Good Deal',
    bg: 'bg-blue-500',
    text: 'text-white',
    border: 'border-blue-500',
    light: 'bg-blue-50 text-blue-700',
  },
  C: {
    label: 'Fair Price',
    bg: 'bg-yellow-500',
    text: 'text-white',
    border: 'border-yellow-500',
    light: 'bg-yellow-50 text-yellow-700',
  },
  D: {
    label: 'Better Options Available',
    bg: 'bg-red-400',
    text: 'text-white',
    border: 'border-red-400',
    light: 'bg-red-50 text-red-700',
  },
}

export function DealScore({ score, size = 'md', showLabel = false }: Props) {
  const config = CONFIG[score]
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs font-bold',
    md: 'w-8 h-8 text-sm font-bold',
    lg: 'w-12 h-12 text-lg font-bold',
  }

  if (showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
          config.light
        )}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full text-white text-xs font-bold w-4 h-4',
            config.bg
          )}
        >
          {score}
        </span>
        {config.label}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full shrink-0',
        config.bg,
        config.text,
        sizeClasses[size]
      )}
    >
      {score}
    </div>
  )
}
