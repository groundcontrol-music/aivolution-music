'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

export default function VideoLightbox({ isOpen, onClose, videoId }: VideoLightboxProps) {
  const portalRef = useRef<Element | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    portalRef.current = document.getElementById('video-lightbox-portal') || document.body;
    
    if (isOpen) {
      setShouldRender(true);
      // Kleine Verzögerung für die Fade-In Animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Warte auf Animation-Ende bevor unmounten
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!shouldRender) return null;

  if (!portalRef.current) {
    return null; 
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/60 p-4 md:p-8 transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleOverlayClick}
    >
      <div
        className={`relative w-full max-w-4xl bg-black border border-red-600/50 rounded-[2.5rem] shadow-[0_0_30px_rgba(220,38,38,0.2)] overflow-hidden transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
          aria-label="Video schließen"
        >
          <X size={24} />
        </button>

        <div className="aspect-video">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>,
    portalRef.current
  );
}