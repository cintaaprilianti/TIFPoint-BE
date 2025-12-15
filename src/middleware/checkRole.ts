// middleware/checkRole.ts
import { Response, NextFunction } from "express";
import { RequestWithUser } from "../types";

export const checkRole = (role: "ADMIN" | "MAHASISWA") => {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ message: `Access denied. Only ${role}.` });
      return;
    }

    next();
  };
};
