'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

type BioModalProps = {
  isOpen: boolean
  onClose: () => void
  artistName: string
  bio: string
  avatarUrl?: string
}

export default function BioModal({ isOpen, onClose, artistName, bio, avatarUrl }: BioModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(220,38,38,1)] mx-4">
          
          {/* Header */}
          <div className="border-b-4 border-black px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {avatarUrl && (
                <div className="w-16 h-16 rounded-full border-2 border-black overflow-hidden">
                  <img src={avatarUrl} alt={artistName} className="w-full h-full object-cover" />
                </div>
              )}
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                {artistName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6 overflow-y-auto max-h-[60vh]">
            <p className="text-base leading-relaxed text-gray-800 whitespace-pre-line">
              {bio || 'Kein Bio vorhanden.'}
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
