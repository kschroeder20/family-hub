import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWidgetExpand } from '../contexts/WidgetExpandContext';

export default function ExpandedWidgetOverlay({ children }) {
  const { expandedWidget, collapseWidget } = useWidgetExpand();

  useEffect(() => {
    if (!expandedWidget) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        collapseWidget();
      }
    };

    // Prevent body scroll when overlay is open
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [expandedWidget, collapseWidget]);

  if (!expandedWidget) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      collapseWidget();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-6xl h-[85vh] animate-scaleIn">
        {/* Expanded widget content */}
        <div className="w-full h-full overflow-auto rounded-2xl shadow-2xl">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
