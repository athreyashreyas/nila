export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex h-dvh flex-col items-center justify-center px-6 py-12 overflow-y-auto"
      style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col items-center gap-1 mb-8 select-none">
        <span className="text-4xl">🌕</span>
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>Nila</span>
      </div>
      {children}
    </main>
  );
}
