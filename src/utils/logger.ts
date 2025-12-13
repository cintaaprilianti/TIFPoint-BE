// src/utils/logger.ts → BUAT FILE BARU!

import prisma from './prisma';

export const logActivity = async (
  userId: string | null,
  action: string,
  description?: string,
  req?: any
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        description: description || null,
        ipAddress: req?.ip || req?.connection?.remoteAddress || null,
        userAgent: req?.get('User-Agent') || null,
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};