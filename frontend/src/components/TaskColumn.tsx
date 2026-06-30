import type { Status, Task } from '../types';
import { STATUS_META } from '../lib/ui';
import TaskCard from './TaskCard';

export default function TaskColumn({ status, tasks }: { status: Status; tasks: Task[] }) {
  const meta = STATUS_META[status];
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-canvas/60">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.soft} ${meta.text}`}>
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">Nothing here yet</p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </section>
  );
}
