import { Request, Response } from "express";
import { shippingAddressSchema, userSchema } from "../utils/validations";
import prisma from "../utils/db";
import { idSchema } from "../utils/validations";

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isVerified: true,
      createdAt: true,
    },
  });

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    data: { users },
  });
};

export const getUserById = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user id",
      error: validatedId.error.issues,
    });
    return;
  }

  const id = validatedId.data;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      isVerified: true,
      createdAt: true,
      shippingAddress: {
        select: {
          id: true,
          address: true,
          state: true,
          country: true,
          postalCode: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User fetched successfully",
    data: { user },
  });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      isVerified: true,
      createdAt: true,
      shippingAddress: {
        select: {
          id: true,
          address: true,
          state: true,
          country: true,
          postalCode: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User fetched succefully",
    data: { user },
  });
};

export const updateUser = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user id",
      error: validatedId.error.issues,
    });
    return;
  }

  const validatedData = userSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const id = validatedId.data;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: validatedData.data,
  });

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: { user: updatedUser },
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    res.status(400).json({
      success: false,
      message: "Invalid user id",
      error: validatedId.error.issues,
    });
    return;
  }

  const id = validatedId.data;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }

  await prisma.user.delete({
    where: { id },
  });

  if (user.id === req.userId) {
    // If the user being deleted is the current user, clear the cookie
    res.clearCookie("token");
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
};

export const setShippingAddress = async (req: Request, res: Response) => {
  const validatedData = shippingAddressSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { address, state, country, postalCode } = validatedData.data;

  const shippingAddress = await prisma.shippingAddress.upsert({
    where: { userId: req.userId },
    create: {
      address,
      state,
      country,
      postalCode,
      userId: req.userId,
    },
    update: {
      address,
      state,
      country,
      postalCode,
    },
  });

  res.status(201).json({
    success: true,
    message: "Shipping Address Successfully added",
    data: { shippingAddress },
  });
};

export const deleteShippingAddress = async (req: Request, res: Response) => {
  const shippingAddress = await prisma.shippingAddress.findUnique({
    where: { userId: req.userId },
  });

  if (!shippingAddress) {
    res.status(404).json({
      success: false,
      message: "Shipping Address not found",
    });
    return;
  }

  await prisma.shippingAddress.delete({
    where: { userId: req.userId },
  });

  res.status(200).json({
    success: true,
    message: "Shipping Address Successfully deleted",
  });
};
