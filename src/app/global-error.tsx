'use client';

// Last line of defence: catches errors in the root layout itself (fonts, theme,
// providers). It replaces the whole document, so it ships its own <html>/<body>
// and inline styles rather than relying on globals.css, which may not have
// loaded. Kept deliberately minimal.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '24px',
          textAlign: 'center',
          background: '#faf9f6',
          color: '#1a1a18',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: '40px' }}>🌙</div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>
            Something slipped
          </h1>
          <p style={{ fontSize: '14px', color: '#6b6960', margin: 0, maxWidth: '260px' }}>
            Your data is safe. Please reopen the app.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            borderRadius: '9999px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            background: '#8e3b5c',
            color: '#fdfcf9',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
