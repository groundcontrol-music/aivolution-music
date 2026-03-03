'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

export default function VideoLightbox({ isOpen, onClose, videoId }: VideoLightboxProps) {
  const portalRef = useRef<Element | null>(null);

  useEffect(() => {
    portalRef.current = document.getElementById('video-lightbox-portal') || document.body;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Verhindert Scrollen des Hintergrunds
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

  if (!isOpen) return null;

  // Sicherstellen, dass das Portal-Element existiert
  if (!portalRef.current) {
    return null; 
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/60 p-4 md:p-8"
          onClick={handleOverlayClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl bg-black border border-red-600/50 rounded-[2.5rem] shadow-[0_0_30px_rgba(220,38,38,0.2)] overflow-hidden"
            // Klassen für Hologramm-Effekt (optional)
            // className="relative w-full max-w-4xl aivo-hologram-border rounded-[2.5rem] shadow-[0_0_30px_rgba(220,38,38,0.2)] overflow-hidden"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalRef.current
  );
}