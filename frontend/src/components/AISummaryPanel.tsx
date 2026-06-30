import { Sparkles, X } from 'lucide-react';
import Spinner from './Spinner';

export default function AISummaryPanel({
  summary,
  loading,
  cached,
  onClose,
}: {
  summary: string;
  loading: boolean;
  cached: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-brand/20 bg-brand/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-brand">
          <Sparkles size={16} />
          AI summary
          {cached && !loading && (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">cached</span>
          )}
        </h2>
        <button onClick={onClose} className="cursor-pointer rounded p-1 text-muted hover:text-ink" aria-label="Hide summary">
          <X size={16} />
        </button>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Writing a status summary...
        </p>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{summary}</p>
      )}
    </div>
  );
}
