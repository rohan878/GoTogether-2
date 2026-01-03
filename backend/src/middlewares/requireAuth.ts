import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../modules/auth/auth.model";

type JwtPayload = {
  userId?: string;
  _id?: string;
  id?: string;
  role?: string;
};

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);

  const anyReq: any = req as any;
  const cookieToken = anyReq.cookies?.token || anyReq.cookies?.accessToken;
  if (cookieToken) return String(cookieToken);

  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const secret = process.env.JWT_SECRET || "";
    if (!secret) return res.status(500).json({ message: "JWT_SECRET missing in .env" });

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const userId = decoded.userId || decoded._id || decoded.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    (req as any).userId = userId;

    const user = await User.findById(userId).select("_id role isAdminApproved isPhoneVerified dnd").lean();
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    (req as any).user = user;

    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  return next();
}
