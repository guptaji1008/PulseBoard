import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { enqueueEmailNotification } from '../notifications/email.queue';

export const projectService = {
  async create(userId: string, data: { name: string; description?: string }) {
    const [project, owner] = await prisma.$transaction([
      prisma.project.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId: userId,
          members: { create: { userId, role: 'OWNER' } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ]);

    if (owner) {
      await enqueueEmailNotification({
        type: 'project-created',
        to: owner.email,
        projectName: project.name,
      });
    }

    return project;
  },

  async listForUser(userId: string) {
    return prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { tasks: true, members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(userId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!project) throw new AppError(404, 'Project not found');
    return project;
  },

  async assertMember(userId: string, projectId: string) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new AppError(403, 'You are not a member of this project');
    return member;
  },

  async assertOwner(userId: string, projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError(404, 'Project not found');
    if (project.ownerId !== userId) throw new AppError(403, 'Only the project owner can do this');
    return project;
  },

  async update(userId: string, projectId: string, data: { name?: string; description?: string }) {
    await this.assertMember(userId, projectId);
    return prisma.project.update({ where: { id: projectId }, data });
  },

  async remove(userId: string, projectId: string) {
    await this.assertOwner(userId, projectId);
    await prisma.project.delete({ where: { id: projectId } });
  },

  async addMember(userId: string, projectId: string, email: string) {
    const project = await this.assertOwner(userId, projectId);
    const [user, owner] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ]);
    if (!user) throw new AppError(404, 'No user found with that email');

    const existingMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (existingMember) return existingMember;

    const member = await prisma.projectMember.create({
      data: { projectId, userId: user.id, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await enqueueEmailNotification({
      type: 'project-member-added',
      to: member.user.email,
      recipientName: member.user.name,
      projectName: project.name,
      addedByName: owner?.name ?? 'A project owner',
    });

    return member;
  },
};
