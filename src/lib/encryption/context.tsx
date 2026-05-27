'use client';

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface EncryptionContextValue {
  getMasterKey: () => CryptoKey | null;
  mountKey: (key: CryptoKey) => void;
  clearKey: () => void;
  isUnlocked: boolean;
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

export function EncryptionProvider({ children }: { children: ReactNode }) {
  // Master key lives in a ref — never in React state, never serialised,
  // invisible in React DevTools component trees.
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const getMasterKey = useCallback(() => masterKeyRef.current, []);

  const mountKey = useCallback((key: CryptoKey) => {
    masterKeyRef.current = key;
    setIsUnlocked(true);
  }, []);

  const clearKey = useCallback(() => {
    masterKeyRef.current = null;
    setIsUnlocked(false);
  }, []);

  return (
    <EncryptionContext.Provider value={{ getMasterKey, mountKey, clearKey, isUnlocked }}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption(): EncryptionContextValue {
  const ctx = useContext(EncryptionContext);
  if (!ctx) throw new Error('useEncryption must be used inside <EncryptionProvider>');
  return ctx;
}
