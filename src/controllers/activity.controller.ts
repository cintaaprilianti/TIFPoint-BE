import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import cloudinary from '../utils/cloudinary';
import { validatePointAssignment } from '../utils/pointCalculation';
import prisma from '../utils/prisma';
import { logActivity } from '../utils/logger';

const db = prisma as any;

export const getAllActivities = async (req: Request, res: Response) => {
  try {
    const userId = (req as RequestWithUser).user?.id;
    const isAdmin = (req as RequestWithUser).user?.role === 'ADMIN';

    const activities = await db.activity.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            nim: true
          }
        },
        competency: true,
        activityType: true,
        recognizedCourse: true,
        event: true,
        verifier: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(activities);
  } catch (error) {
    console.error('Get all activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getActivityById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as RequestWithUser).user?.id;
    const isAdmin = (req as RequestWithUser).user?.role === 'ADMIN';

    const activity = await db.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            nim: true
          }
        },
        competency: true,
        activityType: true,
        recognizedCourse: true,
        event: true,
        verifier: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    if (!activity) {
      res.status(404).json({ message: 'Activity not found' });
      return;
    }

    if (activity.userId !== userId && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized access to this activity' });
      return;
    }

    res.json(activity);
  } catch (error) {
    console.error('Get activity by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createActivity = async (req: Request, res: Response) => {
  try {
    const userId = (req as RequestWithUser).user?.id;
    const {
      title,
      description,
      competencyId,
      activityTypeId,
      documentUrl,
      documentPublicId,
      recognizedCourseId,
      eventId
    } = req.body;

    if (!title || !competencyId || !activityTypeId || !documentUrl) {
      res.status(400).json({ message: 'Required fields are missing' });
      return;
    }

    if (title.trim() === '') {
      res.status(400).json({ message: 'Title cannot be empty' });
      return;
    }

    const competencyExists = await db.competency.findUnique({
      where: { id: competencyId }
    });

    if (!competencyExists) {
      res.status(400).json({ message: 'Invalid competency ID' });
      return;
    }

    const activityTypeExists = await db.activityType.findUnique({
      where: { id: activityTypeId }
    });

    if (!activityTypeExists) {
      res.status(400).json({ message: 'Invalid activity type ID' });
      return;
    }

    if (recognizedCourseId) {
      const courseExists = await db.recognizedCourse.findUnique({
        where: { id: recognizedCourseId }
      });

      if (!courseExists) {
        res.status(400).json({ message: 'Invalid recognized course ID' });
        return;
      }
    }

    if (eventId) {
      const eventExists = await db.event.findUnique({
        where: { id: eventId }
      });

      if (!eventExists) {
        res.status(400).json({ message: 'Invalid event ID' });
        return;
      }
    }

    const activity = await db.activity.create({
      data: {
        title,
        description,
        userId,
        competencyId,
        activityTypeId,
        documentUrl,
        documentPublicId,
        recognizedCourseId,
        eventId
      }
    });

    console.log('activity.controller: logging SUBMIT_ACTIVITY for', userId);
  
    logActivity(userId, 'SUBMIT_ACTIVITY', `Submitted activity ${activity.id}: ${activity.title}`, req).catch((e) => console.error('logActivity error', e));

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });
  } catch (error: any) {
    console.error('Create activity error:', error);

    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Duplicate entry detected' });
      return;
    }

    if (error.code === 'P2003') {
      res.status(400).json({ message: 'Invalid reference ID provided' });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Referenced record not found' });
      return;
    }

    res.status(500).json({ message: 'Server error' });
  }
};

export const updateActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as RequestWithUser).user?.id;
    const isAdmin = (req as RequestWithUser).user?.role === 'ADMIN';
    const { 
      title, 
      description, 
      competencyId, 
      activityTypeId, 
      documentUrl, 
      documentPublicId,
      recognizedCourseId,
      eventId
    } = req.body;

    const activity = await db.activity.findUnique({
      where: { id }
    });

    if (!activity) {
      res.status(404).json({ message: 'Activity not found' });
      return;
    }

    if (activity.userId !== userId && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized to update this activity' });
      return;
    }

    if (!isAdmin && activity.status !== 'PENDING') {
      res.status(403).json({ message: 'Cannot update a processed activity' });
      return;
    }

    const updatedActivity = await db.activity.update({
      where: { id },
      data: {
        title,
        description,
        competencyId,
        activityTypeId,
        documentUrl,
        documentPublicId,
        recognizedCourseId,
        eventId
      }
    });

    res.json({
      message: 'Activity updated successfully',
      activity: updatedActivity
    });

    console.log('activity.controller: logging UPDATE_ACTIVITY for', (req as any).user?.id);

    logActivity((req as any).user?.id, 'UPDATE_ACTIVITY', `Updated activity ${updatedActivity.id}`, req).catch((e) => console.error('logActivity error', e));
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as RequestWithUser).user?.id;
    const isAdmin = (req as RequestWithUser).user?.role === 'ADMIN';

    const activity = await db.activity.findUnique({
      where: { id }
    });

    if (!activity) {
      res.status(404).json({ message: 'Activity not found' });
      return;
    }

    if (activity.userId !== userId && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized to delete this activity' });
      return;
    }

    if (!isAdmin && activity.status !== 'PENDING') {
      res.status(403).json({ message: 'Cannot delete a processed activity' });
      return;
    }

    if (activity.documentPublicId) {
      try {
        await cloudinary.uploader.destroy(activity.documentPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
    }

    await db.activity.delete({
      where: { id }
    });

    res.json({ message: 'Activity deleted successfully' });
    // Log activity deletion
    console.log('activity.controller: logging DELETE_ACTIVITY for', (req as any).user?.id);
    // Fire-and-forget
    logActivity((req as any).user?.id, 'DELETE_ACTIVITY', `Deleted activity ${id}`, req).catch((e) => console.error('logActivity error', e));
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as RequestWithUser).user?.id;
    const { status, point, comment } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ message: 'Valid status (APPROVED or REJECTED) is required' });
      return;
    }

    const activity = await db.activity.findUnique({
      where: { id }
    });

    if (!activity) {
      res.status(404).json({ message: 'Activity not found' });
      return;
    }

    const updatedActivity = await db.activity.update({
      where: { id },
      data: {
        status,
        point,
        comment,
        verifiedById: adminId,
        verifiedAt: new Date()
      }
    });

    // Log verification
    console.log('activity.controller: logging VERIFY_ACTIVITY for', adminId, status);
    // Fire-and-forget
    logActivity(adminId, 'VERIFY_ACTIVITY', `Activity ${id} ${status}`, req).catch((e) => console.error('logActivity error', e));

    res.json({
      message: `Activity ${status.toLowerCase()} successfully`,
      activity: updatedActivity
    });
  } catch (error) {
    console.error('Verify activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getActivitiesWithFilter = async (req: Request, res: Response) => {
  try {
    const userId = (req as RequestWithUser).user?.id;
    const isAdmin = (req as RequestWithUser).user?.role === 'ADMIN';
    const { status, competencyId, activityTypeId, nim, page = 1, limit = 10 } = req.query;

    const whereClause: any = {};

    if (!isAdmin) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (competencyId) {
      whereClause.competencyId = competencyId as string;
    }

    if (activityTypeId) {
      whereClause.activityTypeId = activityTypeId as string;
    }

    if (nim && isAdmin) {
      whereClause.user = {
        nim: {
          contains: nim as string,
          mode: 'insensitive'
        }
      };
    }

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const [activities, totalCount] = await Promise.all([
      db.activity.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              nim: true
            }
          },
          competency: true,
          activityType: true,
          recognizedCourse: true,
          event: true,
          verifier: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNumber
      }),
      db.activity.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.json({
      activities,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1
      }
    });
  } catch (error) {
    console.error('Get activities with filter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const validatePoints = async (req: Request, res: Response) => {
  try {
    const { activityTypeId, competencyId, points } = req.body;

    if (!activityTypeId || !competencyId || points === undefined) {
      res.status(400).json({ message: 'Activity type, competency, and points are required' });
      return;
    }

    const validation = await validatePointAssignment(activityTypeId, competencyId, points);
    res.json(validation);
  } catch (error) {
    console.error('Validate points error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

