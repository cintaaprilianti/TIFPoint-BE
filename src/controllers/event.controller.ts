import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logActivity } from '../utils/logger';

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        date: 'desc'
      }
    });

    res.json(events);
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, location, pointValue } = req.body;

    // Validation
    if (!title || !description || !date || pointValue === undefined) {
      res.status(400).json({ message: 'Required fields are missing' });
      return;
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        pointValue
      }
    });

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
    // Log event creation (fire-and-forget)
    logActivity((req as any).user?.id, 'CREATE_EVENT', `Created event ${event.id} - ${event.title}`, req).catch((e) => console.error('logActivity error', e));
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, pointValue } = req.body;

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        date: date !== undefined ? new Date(date) : undefined,
        location: location !== undefined ? location : undefined,
        pointValue: pointValue !== undefined ? pointValue : undefined
      }
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
    // Log event update (fire-and-forget)
    logActivity((req as any).user?.id, 'UPDATE_EVENT', `Updated event ${updatedEvent.id}`, req).catch((e) => console.error('logActivity error', e));
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Delete event
    await prisma.event.delete({
      where: { id }
    });

    res.json({ message: 'Event deleted successfully' });
    // Log event deletion (fire-and-forget)
    logActivity((req as any).user?.id, 'DELETE_EVENT', `Deleted event ${id}`, req).catch((e) => console.error('logActivity error', e));
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
