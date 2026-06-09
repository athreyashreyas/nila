'use client';

import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  maxHeight?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, maxHeight = '80vh', children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{
              background: 'var(--color-background)',
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
              maxHeight,
              overflowY: 'auto',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
