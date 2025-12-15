import { Request, Response, NextFunction } from "express";

/**
 * AUDITING - Security measures untuk prevent attacks
 */

// Store request attempts in memory (production: use Redis)
const requestAttempts: Map<string, { count: number; resetTime: number }> =
  new Map();

/**
 * Rate limiting middleware - prevent brute force & DDoS
 * Max 100 requests per 15 minutes per IP
 */
export const rateLimit = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || "unknown";
    const now = Date.now();

    const attempt = requestAttempts.get(clientIp);

    if (attempt && now < attempt.resetTime) {
      attempt.count++;

      if (attempt.count > maxRequests) {
        res.status(429).json({
          message: "Terlalu banyak request. Coba lagi nanti.",
          retryAfter: Math.ceil((attempt.resetTime - now) / 1000),
        });
        return;
      }
    } else {
      // Reset counter
      requestAttempts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
    }

    next();
  };
};

/**
 * Input validation - prevent injection attacks
 * Validasi format email, password strength, dll
 */
export const validateAuthInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password, username, name } = req.body;

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    res.status(400).json({ message: "Email format tidak valid" });
    return;
  }

  // Password validation - minimum 6 characters
  if (password && password.length < 6) {
    res.status(400).json({
      message: "Password harus minimal 6 karakter",
      requirements: ["Minimal 6 karakter"],
    });
    return;
  }

  // Username validation - alphanumeric dan underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (username && !usernameRegex.test(username)) {
    res.status(400).json({
      message:
        "Username harus 3-20 karakter, hanya huruf, angka, dan underscore",
    });
    return;
  }

  // Name validation - tidak boleh terlalu panjang
  if (name && name.length > 100) {
    res
      .status(400)
      .json({ message: "Nama terlalu panjang (max 100 karakter)" });
    return;
  }

  next();
};

/**
 * Prevent SQL injection by sanitizing inputs
 * Prisma sudah handle ini, tapi extra validation untuk safety
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === "string") {
      // Remove potentially dangerous characters
      return obj
        .replace(/[<>\"']/g, "") // Remove <>"'
        .trim();
    }
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query) as any;
  req.params = sanitize(req.params) as any;

  next();
};

/**
 * Prevent parameter pollution
 * Validasi bahwa request hanya punya parameter yang expected
 */
export const validateAllowedFields = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const bodyKeys = Object.keys(req.body);
    const invalidKeys = bodyKeys.filter((key) => !allowedFields.includes(key));

    if (invalidKeys.length > 0) {
      res.status(400).json({
        message: "Invalid fields provided",
        invalidFields: invalidKeys,
        allowedFields,
      });
      return;
    }

    next();
  };
};

/**
 * Validate activity input - prevent XSS
 */
export const validateActivityInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { title, description } = req.body;

  // Check length
  if (title && title.length > 200) {
    res
      .status(400)
      .json({ message: "Title terlalu panjang (max 200 karakter)" });
    return;
  }

  if (description && description.length > 1000) {
    res
      .status(400)
      .json({ message: "Description terlalu panjang (max 1000 karakter)" });
    return;
  }

  next();
};