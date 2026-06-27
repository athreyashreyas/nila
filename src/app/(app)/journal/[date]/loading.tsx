// Shown instantly by Next.js while the journal entry route loads, so tapping a
// day in the calendar feels immediate instead of waiting on a blank transition.

function Block({ h, w = '100%' }: { h: number; w?: string }) {
  return (
    <div
      className="rounded-[var(--radius-sm)] animate-pulse"
      style={{ height: h, width: w, background: 'var(--color-surface)' }}
    />
  );
}

export default function JournalDateLoading() {
  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="text-xl" style={{ color: 'var(--color-accent)' }}>‹</div>
        <div className="flex flex-col gap-1.5">
          <Block h={18} w="90px" />
          <Block h={12} w="150px" />
        </div>
      </div>

      {/* Mood / flow / symptoms / notes placeholders */}
      {['Mood', 'Flow', 'Symptoms', 'Notes'].map((label, i) => (
        <div key={label} className="flex flex-col gap-3">
          <Block h={11} w="70px" />
          <Block h={i === 3 ? 96 : 48} />
        </div>
      ))}

      <Block h={48} />
    </div>
  );
}
