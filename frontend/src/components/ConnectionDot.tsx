export default function ConnectionDot({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={live ? 'Live updates on' : 'Connecting...'}>
      <span className="relative flex h-2 w-2">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-done/60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? 'bg-done' : 'bg-muted/50'}`} />
      </span>
      {live ? 'Live' : 'Offline'}
    </span>
  );
}
