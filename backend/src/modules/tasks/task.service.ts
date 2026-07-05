import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { projectService } from '../projects/project.service';
import { emitToProject } from '../../sockets';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';
import { enqueueEmailNotification } from '../notifications/email.queue';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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

    if (task.assignee) {
      const [project, actor] = await Promise.all([
        prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ]);

      await enqueueEmailNotification({
        type: 'task-assigned',
        to: task.assignee.email,
        recipientName: task.assignee.name,
        taskTitle: task.title,
        projectName: project?.name ?? 'a project',
        assignedByName: actor?.name ?? 'A project member',
      });
    }

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

    const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== task.assigneeId;
    const statusChanged = data.status !== undefined && data.status !== task.status;

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

    if (updated.assignee && (assigneeChanged || statusChanged)) {
      const [project, actor] = await Promise.all([
        prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ]);
      const projectName = project?.name ?? 'a project';
      const actorName = actor?.name ?? 'A project member';

      if (assigneeChanged) {
        await enqueueEmailNotification({
          type: 'task-assigned',
          to: updated.assignee.email,
          recipientName: updated.assignee.name,
          taskTitle: updated.title,
          projectName,
          assignedByName: actorName,
        });
      }

      if (statusChanged && data.status) {
        await enqueueEmailNotification({
          type: 'task-status-changed',
          to: updated.assignee.email,
          recipientName: updated.assignee.name,
          taskTitle: updated.title,
          projectName,
          oldStatus: formatStatus(task.status),
          newStatus: formatStatus(data.status),
          changedByName: actorName,
        });
      }
    }

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
