'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed bottom-28 left-1/2 z-50 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-xl pointer-events-none"
          style={{ background: 'var(--color-foreground)', color: 'var(--color-background)', whiteSpace: 'nowrap' }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);

  const show = useCallback((text: string, ms = 2200) => {
    setMsg(text);
    setTimeout(() => setMsg(null), ms);
  }, []);

  return { toastMsg: msg, showToast: show };
}
