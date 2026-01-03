import type { Request, Response, NextFunction } from "express";

/**
 * Only allow ADMIN users.
 * Assumes `protect` middleware already attached req.user.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const role = String(user?.role ?? "USER").toUpperCase();

  if (role !== "ADMIN") {
    return res.status(403).json({ message: "Admin only" });
  }

  return next();
};
