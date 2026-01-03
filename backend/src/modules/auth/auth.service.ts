import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const hashPassword = async (password: string) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const signToken = (payload: object) => {
  // NOTE: keep runtime safe even if env vars are missing.
  // In production you should set JWT_SECRET properly.
  const secret = process.env.JWT_SECRET ?? "dev_secret_change_me";
  // jsonwebtoken's TS types are strict (StringValue | number), so we cast safely.
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as any;
  return jwt.sign(payload, secret, { expiresIn } as any);
};
