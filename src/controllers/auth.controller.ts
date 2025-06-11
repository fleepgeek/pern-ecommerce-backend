import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/db";
import { loginSchema, signupSchema } from "../utils/validations";
import { generateTokenAndSetCookie } from "../utils/auth";

export const signUp = async (req: Request, res: Response) => {
  try {
    const validatedData = signupSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validatedData.error.issues,
      });
      return;
    }

    const { email, password, name } = validatedData.data;

    const result = await prisma.$transaction(async (tx) => {
      const userExists = await tx.user.findFirst({ where: { email } });
      if (userExists) {
        res
          .status(400)
          .json({ success: false, message: "User already exists" });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        omit: { password: true, updatedAt: true },
      });

      return user;
    });

    generateTokenAndSetCookie(res, result?.id as string);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: result,
      },
    });
  } catch (error: any) {
    console.error("Error in signUp:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validatedData.error.issues,
      });
      return;
    }

    const { email, password } = validatedData.data;

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      res
        .status(404)
        .json({ success: false, message: "Incorrect email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(400)
        .json({ success: false, message: "Incorrect email or password" });
      return;
    }

    generateTokenAndSetCookie(res, user.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: { ...user, password: undefined } },
    });
  } catch (error: any) {
    console.error("Error in login", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logout successful" });
};

export const checkAuth = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id: req.userId },
      omit: { password: true, updatedAt: true },
    });
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User is Authenticated",
      data: { user },
    });
  } catch (error: any) {
    console.error("Error checking auth");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
