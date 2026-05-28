export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ overflow: 'hidden', touchAction: 'none' }}
    >
      <div className="flex flex-col items-center gap-1 mb-8 select-none">
        <span className="text-4xl">🌕</span>
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-foreground)' }}>Nila</span>
      </div>
      {children}
    </main>
  );
}
