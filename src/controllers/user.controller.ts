import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Type assertion to fix Prisma TypeScript issues
const db = prisma as any;

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { nim, role, search } = req.query;

    // Build where clause for filtering
    const whereClause: any = {};

    if (nim) {
      whereClause.nim = {
        contains: nim as string,
        mode: 'insensitive'
      };
    }

    if (role) {
      whereClause.role = role as string;
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          username: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search as string,
            mode: 'insensitive'
          }
        }
      ];
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, name, nim, role, password } = req.body;
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if auth user is admin or updating own profile
    const requestingUserId = (req as any).user.id;
    const isAdmin = (req as any).user.role === 'ADMIN';
    
    if (id !== requestingUserId && !isAdmin) {
      res.status(403).json({ message: 'Unauthorized to update this user' });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (nim) updateData.nim = nim;
    if (role && isAdmin) updateData.role = role; // Only admin can update role
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        nim: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if auth user is admin
    if ((req as any).user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only admin can delete users' });
      return;
    }

    // Delete user
    await db.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
    return;
  }
};