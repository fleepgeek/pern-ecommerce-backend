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
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "../middlewares/error.middleware";

const DEFAULT_ROLE = "USER";

export const signUp = async (req: Request, res: Response) => {
  const validatedData = signupSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { email, password, name } = validatedData.data;

  // There's really no need of making this an atomic transaction as there are
  // no dependent writes/updates (only one record is added ie user)
  const result = await prisma.$transaction(async (tx) => {
    const userExists = await tx.user.findUnique({ where: { email } });
    if (userExists) {
      // Instead of throwing generic Error, throw custom error with status
      // do this because we can't set status codes inside a transaction
      throw new ConflictError("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = generateTokenCode(32);
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ); // expires in 24hrs

    let defaultRole = await tx.role.findUnique({
      where: { name: DEFAULT_ROLE },
    });
    if (!defaultRole) {
      defaultRole = await tx.role.create({ data: { name: DEFAULT_ROLE } });
    }

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roles: {
          create: [{ roleId: defaultRole.id }],
        },
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
};

export const login = async (req: Request, res: Response) => {
  const validatedData = loginSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { email, password } = validatedData.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError("Incorrect email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new BadRequestError("Incorrect email or passwordd");
  }

  generateAccessTokenAndSetCookie(res, user.id);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: { user: { ...user, password: undefined } },
  });
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logout successful" });
};

export const checkAuth = async (req: Request, res: Response) => {
  if (!req.userId) {
    throw new AuthenticationError("User not authenticated");
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
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { verificationToken } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      verificationToken,
      verificationTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new BadRequestError(
      "Invalid or expired verification code. Resend an account verification request"
    );
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
};

export const resendVerifyEmail = async (req: Request, res: Response) => {
  const validatedData = emailSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation Failed", validatedData.error.issues);
  }

  const { email } = validatedData.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new NotFoundError(
      "User not found. Please make sure you entered the email you used to create an account."
    );
  }

  if (user.isVerified) {
    throw new BadRequestError("User is already verified");
  }

  if (
    user.verificationTokenExpiresAt &&
    user.verificationTokenExpiresAt > new Date()
  ) {
    throw new BadRequestError(
      "Verification token is still valid. Please check your email."
    );
  }

  const verificationToken = generateTokenCode(32);
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // expires in 24hrs

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
};

export const changePassword = async (req: Request, res: Response) => {
  const validatedData = changePasswordSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { currentPassword, newPassword } = validatedData.data;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user?.password || ""
  );
  if (!isPasswordValid) {
    throw new BadRequestError("Current password is incorrect");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user!.password);
  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password"
    );
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
};

export const forgotPassword = async (req: Request, res: Response) => {
  const validatedData = emailSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }
  const { email } = validatedData.data;

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
};

export const resetPassword = async (req: Request, res: Response) => {
  const validatedData = resetPasswordSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { newPassword } = validatedData.data;
  const { resetToken } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: resetToken,
      passwordResetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new BadRequestError(
      "Invalid or expired password reset token. Please request a new password reset."
    );
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new BadRequestError(
      "New password must be different from current password"
    );
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
};
