export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
}

export interface Member {
  id: string;
  role: 'OWNER' | 'MEMBER';
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  _count?: { tasks: number; members: number };
  members?: Member[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: Status;
  priority: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string;
  rank: number;
}
