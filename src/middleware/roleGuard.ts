import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';

export const studentOnly = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as RequestWithUser).user;

  if (!user || user.role !== 'MAHASISWA') {
    res.status(403).json({
      message: 'Akses ditolak! Halaman ini hanya untuk Mahasiswa.',
    });
    return; 
  }

  next(); 
};

export const adminOnlyStrict = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as RequestWithUser).user;

  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({
      message: 'Akses ditolak! Halaman ini hanya untuk Admin.',
    });
    return;
  }

  next();
};
