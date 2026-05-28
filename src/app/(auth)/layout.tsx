export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ overflow: 'hidden', touchAction: 'none' }}
    >
      {children}
    </main>
  );
}
