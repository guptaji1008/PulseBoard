import { useState } from 'react';
import { FolderPlus, Plus } from 'lucide-react';
import { useGetProjectsQuery } from '../services/api';
import ProjectCard from '../components/ProjectCard';
import CreateProjectModal from '../components/CreateProjectModal';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Spinner from '../components/Spinner';

export default function ProjectsPage() {
  const { data: projects, isLoading, isError } = useGetProjectsQuery();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted">Your workspaces and their boards</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          <span className="hidden sm:inline">New project</span>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {isError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load projects. Is the API running?
        </p>
      )}

      {projects && projects.length === 0 && (
        <EmptyState
          icon={<FolderPlus size={40} strokeWidth={1.5} />}
          title="No projects yet"
          message="Create your first project to start adding tasks and inviting your team."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              New project
            </Button>
          }
        />
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
