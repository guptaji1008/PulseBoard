import { Link } from 'react-router-dom';
import { CheckSquare, Users } from 'lucide-react';
import type { Project } from '../types';
import { formatDate } from '../lib/ui';

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <h3 className="font-display text-lg font-semibold text-ink group-hover:text-brand">
        {project.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted">
        {project.description || 'No description'}
      </p>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CheckSquare size={14} />
          {project._count?.tasks ?? 0} tasks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users size={14} />
          {project._count?.members ?? 1} members
        </span>
        <span className="ml-auto">{formatDate(project.createdAt)}</span>
      </div>
    </Link>
  );
}
