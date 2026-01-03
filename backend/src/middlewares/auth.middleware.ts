import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../modules/auth/auth.model";

// What we store inside JWT
type JwtPayload = {
  userId: string;
};

// Attach user on req (simple approach)
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const secret = process.env.JWT_SECRET ?? "dev_secret_change_me";

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    const userId = (decoded as any)?.userId as string | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as any).user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireVerifiedPhone = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user?.isPhoneVerified) {
    return res.status(403).json({ message: "Phone not verified" });
  }

  return next();
};

export const requireAdminApproval = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user?.isAdminApproved) {
    return res.status(403).json({ message: "Admin approval pending" });
  }

  return next();
};
