import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export const projectService = {
  async create(userId: string, data: { name: string; description?: string }) {
    return prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
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
    await this.assertOwner(userId, projectId);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(404, 'No user found with that email');
    return prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      update: {},
      create: { projectId, userId: user.id, role: 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  },
};
