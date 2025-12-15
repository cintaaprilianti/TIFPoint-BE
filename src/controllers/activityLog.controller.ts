import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', userId, action } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId as string;
    if (action) where.action = action as string;

    const [logs, total] = await Promise.all([
      (prisma as any).activityLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip, take: limitNum }),
      (prisma as any).activityLog.count({ where })
    ]);

    res.json({ logs, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (e) {
    console.error('Get activity logs error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { getActivityLogs };
