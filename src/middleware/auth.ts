import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { RequestWithUser, UserPayload } from '../types';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token, authorization denied' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as UserPayload;
    
    // Add user from payload to request
    (req as RequestWithUser).user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const userReq = req as RequestWithUser;
  if (userReq.user?.role !== 'ADMIN') {
    res.status(403).json({ message: 'Access denied. Admin only.' });
    return;
  }
  next();
};