import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { API_URL } from '../lib/config';
import { logout } from '../features/auth/authSlice';
import type { AuthResponse, Project, Task, User, SearchResult, Status, Priority } from '../types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}`,
  credentials: 'include',
});

// Wrap the base query so an expired/invalid token logs the user out cleanly.
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  apiCtx,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, apiCtx, extraOptions);
  if (result.error && result.error.status === 401) {
    apiCtx.dispatch(logout());
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Project', 'Projects', 'Tasks'],
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, { name: string; email: string; password: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    logoutApi: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    me: builder.query<User, void>({ query: () => '/auth/me' }),
    getSocketToken: builder.query<{ token: string }, void>({ query: () => '/auth/socket-token' }),

    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Projects'],
    }),
    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<Project, { name: string; description?: string }>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Projects'],
    }),
    addMember: builder.mutation<unknown, { projectId: string; email: string }>({
      query: ({ projectId, email }) => ({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        body: { email },
      }),
      invalidatesTags: (_res, _err, { projectId }) => [{ type: 'Project', id: projectId }],
    }),

    getTasks: builder.query<Task[], string>({
      query: (projectId) => `/projects/${projectId}/tasks`,
      providesTags: (_res, _err, projectId) => [{ type: 'Tasks', id: projectId }],
    }),
    createTask: builder.mutation<
      Task,
      { projectId: string; title: string; description?: string; priority?: Priority; assigneeId?: string; dueDate?: string }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/tasks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_res, _err, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),
    updateTask: builder.mutation<
      Task,
      {
        id: string;
        projectId: string;
        patch: Partial<{
          title: string;
          description: string;
          status: Status;
          priority: Priority;
          assigneeId: string | null;
          dueDate: string | null;
        }>;
      }
    >({
      query: ({ id, patch }) => ({ url: `/tasks/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_res, _err, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),
    deleteTask: builder.mutation<void, { id: string; projectId: string }>({
      query: ({ id }) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_res, _err, { projectId }) => [{ type: 'Tasks', id: projectId }],
    }),

    searchTasks: builder.query<{ query: string; count: number; results: SearchResult[] }, string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),

    summarizeProject: builder.mutation<{ summary: string; cached: boolean }, string>({
      query: (projectId) => ({ url: `/projects/${projectId}/summary`, method: 'POST' }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutApiMutation,
  useMeQuery,
  useGetSocketTokenQuery,
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useAddMemberMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useSearchTasksQuery,
  useSummarizeProjectMutation,
} = api;