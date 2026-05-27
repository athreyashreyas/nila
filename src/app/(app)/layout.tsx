// Authenticated app shell — will add EncryptionProvider and BottomNav here
// once those are implemented

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      {/* BottomNav goes here */}
    </div>
  );
}
