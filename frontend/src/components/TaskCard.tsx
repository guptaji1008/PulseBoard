import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Task, Status } from '../types';
import { STATUSES, STATUS_META } from '../lib/ui';
import { PriorityBadge } from './Badge';
import Avatar from './Avatar';
import { useDeleteTaskMutation, useUpdateTaskMutation } from '../services/api';

export default function TaskCard({ task }: { task: Task }) {
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const onStatusChange = (status: Status) => {
    if (status === task.status) return;
    updateTask({ id: task.id, projectId: task.projectId, patch: { status } });
  };

  const onDelete = () => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Delete &ldquo;{task.title}&rdquo;?</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              toast.promise(
                deleteTask({ id: task.id, projectId: task.projectId }).unwrap(),
                { loading: 'Deleting…', success: 'Task deleted', error: 'Failed to delete task' },
              );
            }}
            className="cursor-pointer rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
          >
            Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="cursor-pointer rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{task.title}</p>
        <button
          onClick={onDelete}
          className="cursor-pointer -mr-1 -mt-1 rounded p-1 text-muted/60 hover:bg-rose-50 hover:text-rose-600"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{task.description}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
      </div>

      <div className="mt-3">
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Move task
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          disabled={updating}
          onChange={(e) => onStatusChange(e.target.value as Status)}
          className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs font-medium text-ink focus:border-brand"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Move to {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
