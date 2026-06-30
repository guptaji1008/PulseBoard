import { useSearchParams, Link } from 'react-router-dom';
import { useSearchTasksQuery } from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { SearchX } from 'lucide-react';
import type { Status, Priority } from '../types';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data, isFetching } = useSearchTasksQuery(q, { skip: !q });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Search</h1>
      <p className="mb-6 text-sm text-muted">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Type a query in the search bar above'}
      </p>

      {isFetching && (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {data && data.results.length === 0 && (
        <EmptyState
          icon={<SearchX size={40} strokeWidth={1.5} />}
          title="No matches"
          message="No tasks matched your search. Try a different word."
        />
      )}

      {data && data.results.length > 0 && (
        <ul className="space-y-2">
          {data.results.map((r) => (
            <li key={r.id}>
              <Link
                to={`/projects/${r.projectId}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                  {r.description && <p className="truncate text-xs text-muted">{r.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={r.priority as Priority} />
                  <StatusBadge status={r.status as Status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
