import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/classNames.js';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

/**
 * Centered modal. `onClose` is called for backdrop clicks and Escape — the
 * parent decides whether that actually closes (e.g. a dirty form can intercept
 * and confirm first). `size` picks the max width; `bodyClassName` lets a large
 * modal manage its own scroll region.
 */
export default function Modal({ open, onClose, title, children, size = 'md', bodyClassName }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={cn(
              'flex max-h-[90vh] w-full flex-col rounded-2xl border border-gray-200/70 bg-white p-6 shadow-pop dark:border-white/10 dark:bg-gray-900',
              SIZES[size] || SIZES.md,
            )}
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <h2 className="mb-4 shrink-0 text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                {title}
              </h2>
            )}
            <div className={cn('min-h-0', bodyClassName)}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
