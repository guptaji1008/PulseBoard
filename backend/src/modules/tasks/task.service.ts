import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { projectService } from '../projects/project.service';
import { emitToProject } from '../../sockets';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
};

export const taskService = {
  async create(userId: string, projectId: string, data: CreateTaskInput) {
    await projectService.assertMember(userId, projectId);
    if (data.assigneeId) await projectService.assertMember(data.assigneeId, projectId);

    const task = await prisma.task.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        priority: data.priority ?? 'MEDIUM',
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: taskInclude,
    });

    // Real-time: notify everyone viewing this project's board.
    emitToProject(projectId, 'task:created', task);
    return task;
  },

  async listByProject(userId: string, projectId: string) {
    await projectService.assertMember(userId, projectId);
    return prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async update(userId: string, taskId: string, data: UpdateTaskInput) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError(404, 'Task not found');
    await projectService.assertMember(userId, task.projectId);
    if (data.assigneeId) await projectService.assertMember(data.assigneeId, task.projectId);

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        dueDate:
          data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      },
      include: taskInclude,
    });

    emitToProject(task.projectId, 'task:updated', updated);
    return updated;
  },

  async remove(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError(404, 'Task not found');
    await projectService.assertMember(userId, task.projectId);

    await prisma.task.delete({ where: { id: taskId } });
    emitToProject(task.projectId, 'task:deleted', { id: taskId });
  },
};
