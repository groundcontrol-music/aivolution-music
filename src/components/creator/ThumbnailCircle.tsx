'use client'

type ThumbnailCircleProps = {
  imageUrl?: string
  label?: string
  onClick?: () => void
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function ThumbnailCircle({ imageUrl, label, onClick, icon, size = 'md' }: ThumbnailCircleProps) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full border-2 border-black bg-white overflow-hidden hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] transition-all duration-200 hover:scale-105`}
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={label || 'Thumbnail'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-2xl">
            {icon || '🎬'}
          </div>
        )}
      </button>
      {label && (
        <span className="text-xs font-bold uppercase text-center max-w-[6rem] line-clamp-1">
          {label}
        </span>
      )}
    </div>
  )
}
