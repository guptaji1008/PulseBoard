import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, UserPlus } from 'lucide-react';
import {
  api,
  useGetProjectQuery,
  useGetTasksQuery,
  useSummarizeProjectMutation,
} from '../services/api';
import { useAppDispatch } from '../app/hooks';
import { getSocket } from '../lib/socket';
import { STATUSES } from '../lib/ui';
import type { Task } from '../types';
import TaskColumn from '../components/TaskColumn';
import CreateTaskModal from '../components/CreateTaskModal';
import AddMemberModal from '../components/AddMemberModal';
import AISummaryPanel from '../components/AISummaryPanel';
import ConnectionDot from '../components/ConnectionDot';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Spinner from '../components/Spinner';

export default function ProjectBoardPage() {
  const { projectId = '' } = useParams();
  const dispatch = useAppDispatch();

  const { data: project } = useGetProjectQuery(projectId, { skip: !projectId });
  const { data: tasks, isLoading } = useGetTasksQuery(projectId, { skip: !projectId });

  const [taskModal, setTaskModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [live, setLive] = useState(false);

  const [summarize, { data: summaryData, isLoading: summarizing }] = useSummarizeProjectMutation();
  const [showSummary, setShowSummary] = useState(false);

  // Real-time: join the project room and patch the task cache as events arrive.
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    const patch = (recipe: (draft: Task[]) => void) =>
      dispatch(api.util.updateQueryData('getTasks', projectId, recipe));

    const onConnect = () => {
      setLive(true);
      socket.emit('project:join', projectId);
    };
    const onDisconnect = () => setLive(false);
    const onCreated = (task: Task) =>
      patch((draft) => {
        if (!draft.some((t) => t.id === task.id)) draft.unshift(task);
      });
    const onUpdated = (task: Task) =>
      patch((draft) => {
        const i = draft.findIndex((t) => t.id === task.id);
        if (i >= 0) draft[i] = task;
      });
    const onDeleted = ({ id }: { id: string }) =>
      patch((draft) => {
        const i = draft.findIndex((t) => t.id === id);
        if (i >= 0) draft.splice(i, 1);
      });

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:deleted', onDeleted);

    return () => {
      socket.emit('project:leave', projectId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
    };
  }, [projectId, dispatch]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    (tasks ?? []).forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  const onSummarize = async () => {
    setShowSummary(true);
    await summarize(projectId);
  };

  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} />
        All projects
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">{project?.name ?? 'Loading...'}</h1>
            <ConnectionDot live={live} />
          </div>
          {project?.description && <p className="mt-1 text-sm text-muted">{project.description}</p>}
          {project?.members && (
            <div className="mt-3 flex items-center -space-x-1.5">
              {project.members.map((m) => (
                <span key={m.id} className="ring-2 ring-canvas rounded-full">
                  <Avatar name={m.user.name} size="sm" />
                </span>
              ))}
              <button
                onClick={() => setMemberModal(true)}
                className="cursor-pointer ml-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <UserPlus size={14} />
                Add
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onSummarize} disabled={summarizing}>
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI summary</span>
          </Button>
          <Button onClick={() => setTaskModal(true)}>
            <Plus size={16} />
            <span className="hidden sm:inline">New task</span>
          </Button>
        </div>
      </div>

      {showSummary && (
        <AISummaryPanel
          loading={summarizing}
          summary={summaryData?.summary ?? ''}
          cached={summaryData?.cached ?? false}
          onClose={() => setShowSummary(false)}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STATUSES.map((status) => (
            <TaskColumn key={status} status={status} tasks={grouped[status] ?? []} />
          ))}
        </div>
      )}

      <CreateTaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        projectId={projectId}
        members={project?.members ?? []}
      />
      <AddMemberModal open={memberModal} onClose={() => setMemberModal(false)} projectId={projectId} />
    </div>
  );
}
