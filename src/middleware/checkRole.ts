// middleware/checkRole.ts
import { Response, NextFunction } from "express";
import { RequestWithUser } from "./auth";

export const checkRole = (role: "ADMIN" | "MAHASISWA") => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. Only ${role}.` });
    }

    next();
  };
};
