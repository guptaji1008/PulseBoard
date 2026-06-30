import type { Status, Priority } from '../types';

export const STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

// Full literal class strings so Tailwind can detect them statically.
export const STATUS_META: Record<
  Status,
  { label: string; dot: string; text: string; soft: string; bar: string }
> = {
  TODO: { label: 'To do', dot: 'bg-todo', text: 'text-todo', soft: 'bg-todo/10', bar: 'bg-todo' },
  IN_PROGRESS: { label: 'In progress', dot: 'bg-progress', text: 'text-progress', soft: 'bg-progress/10', bar: 'bg-progress' },
  DONE: { label: 'Done', dot: 'bg-done', text: 'text-done', soft: 'bg-done/10', bar: 'bg-done' },
};

export const PRIORITY_META: Record<Priority, { label: string; cls: string }> = {
  LOW: { label: 'Low', cls: 'text-slate-600 bg-slate-100' },
  MEDIUM: { label: 'Medium', cls: 'text-indigo-700 bg-indigo-50' },
  HIGH: { label: 'High', cls: 'text-rose-700 bg-rose-50' },
};

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
