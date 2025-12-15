import { Request } from 'express';
import prisma from './prisma';

export async function logActivity(
  userId: string | null | undefined,
  action: string,
  description?: string,
  req?: Request
) {
  console.log('logActivity called:', { userId, action, description });
  try {
    const ipAddress =
      (req && (req.headers['x-forwarded-for'] as string)) ||
      (req && (req.socket?.remoteAddress || (req as any).ip)) ||
      null;

    const userAgent = req?.headers['user-agent'] as string | undefined;

    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        action,
        description: description || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      }
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}

export default { logActivity };
