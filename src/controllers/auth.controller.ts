import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/db";
import {
  changePasswordSchema,
  loginSchema,
  emailSchema,
  signupSchema,
  resetPasswordSchema,
} from "../utils/validations";
import {
  generateAccessTokenAndSetCookie,
  generateTokenCode,
} from "../utils/auth";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../utils/sendmail";

export const signUp = async (req: Request, res: Response) => {
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

  try {
    // There's really no need of making this an atomic transaction as there are
    // no dependent writes/updates (only one record is added ie user)
    const result = await prisma.$transaction(async (tx) => {
      const userExists = await tx.user.findUnique({ where: { email } });
      if (userExists) {
        // Instead of throwing generic Error, throw custom error with status
        // do this because we can't set status codes inside a transaction
        throw { status: 409, message: "User already exists" };
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const verificationToken = generateTokenCode(32);
      const verificationTokenExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ); // expires in 24hrs

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          verificationToken,
          verificationTokenExpiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          verificationToken: true,
          verificationTokenExpiresAt: true,
        },
      });

      return user;
    });

    generateAccessTokenAndSetCookie(res, result.id);

    await sendVerificationEmail(
      result.email,
      result.name,
      result.verificationToken!
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: result,
      },
    });
  } catch (error: any) {
    console.error("Error in signUp:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
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

  try {
    const user = await prisma.user.findUnique({
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

    generateAccessTokenAndSetCookie(res, user.id);

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

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
      },
    });
    // No need to check for user as user must already exist in the req
    // as this is covered in the authenticate middleware
    // if (!user) {
    //   res
    //     .status(401)
    //     .json({ success: false, message: "User not authenticated" });
    //   return;
    // }

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

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { verificationToken } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        verificationToken,
        verificationTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification code. Resend an account verification request",
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
      },
    });

    await sendWelcomeEmail(user.email, user.name);

    res.status(200).json({
      success: true,
      message: "Account Verification Successful",
      data: { user: updatedUser },
    });
  } catch (error: any) {
    console.error("Error in Account Verification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const resendVerifyEmail = async (req: Request, res: Response) => {
  const validatedData = emailSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { email } = validatedData.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message:
          "User not found. Please make sure you entered the email you used to create an account.",
      });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: "User is already verified",
      });
      return;
    }

    if (
      user.verificationTokenExpiresAt &&
      user.verificationTokenExpiresAt > new Date()
    ) {
      res.status(400).json({
        success: false,
        message: "Verification token is still valid. Please check your email.",
      });
      return;
    }

    const verificationToken = generateTokenCode(32);
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ); // expires in 24hrs

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    await sendVerificationEmail(user.email, user.name, verificationToken);

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });
  } catch (error: any) {
    console.error("Error in Resending Verification Email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const validatedData = changePasswordSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { currentPassword, newPassword } = validatedData.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user?.password || ""
    );
    if (!isPasswordValid) {
      res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
      return;
    }

    const isSamePassword = await bcrypt.compare(newPassword, user!.password);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedNewPassword },
    });

    generateAccessTokenAndSetCookie(res, req.userId);

    await sendPasswordChangedEmail(user!.email, user!.name);

    res
      .status(200)
      .json({ success: true, message: "Password changed successfully." });
  } catch (error: any) {
    console.error("Error changing password");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const validatedData = emailSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }
  const { email } = validatedData.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isVerified) {
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link",
      });
      return;
    }

    if (
      user.passwordResetTokenExpiresAt &&
      user.passwordResetTokenExpiresAt > new Date()
    ) {
      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link",
      });
      return;
    }

    const passwordResetToken = generateTokenCode(20);
    const passwordResetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken, passwordResetTokenExpiresAt },
    });

    await sendPasswordResetEmail(user.email, user.name, passwordResetToken);

    res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link",
    });
  } catch (error: any) {
    console.error("Forgot password error");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const validatedData = resetPasswordSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { newPassword } = validatedData.data;
  const { resetToken } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message:
          "Invalid or expired password reset token. Please request a new password reset.",
      });
      return;
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    generateAccessTokenAndSetCookie(res, user.id);

    await sendPasswordChangedEmail(user!.email, user!.name);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error: any) {
    console.error("Error resetting password");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
