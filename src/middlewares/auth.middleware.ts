import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import prisma from "../utils/db";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as JwtPayload;

    if (!decoded) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    if (!user.isVerified) {
      //generate verification token and send verification mail
      res.status(403).json({
        success: false,
        message: "Account not verified check your mail for verification link",
      });
      return;
    }

    req.userId = user.id;

    next();
  } catch (error: any) {
    console.error("Error authenticating", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findFirst({
      where: { id: req.userId },
      include: { roles: { include: { role: true } } },
    });

    // if (!allowedRoles.includes(user!.role)) {
    if (!user!.roles.some((role) => allowedRoles.includes(role.role.name))) {
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
      return;
    }

    next();
  };
};
