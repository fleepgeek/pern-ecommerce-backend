import { Request, Response } from "express";
import { shippingAddressSchema, userSchema } from "../utils/validations";
import prisma from "../utils/db";
import { idSchema } from "../utils/validations";
import {
  AuthenticationError,
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";

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
    throw new BadRequestError("Invalid user id");
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
    throw new NotFoundError("User not found");
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
      roles: true,
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
    throw new NotFoundError("User not found");
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
    throw new BadRequestError("Invalid user id");
  }

  const validatedData = userSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const id = validatedId.data;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const loggedInUser = await prisma.user.findFirst({
    where: { id: req.userId },
    include: { roles: { include: { role: true } } },
  });

  const isOwner = user.id === loggedInUser?.id;
  const isAdmin = loggedInUser?.roles.some(
    (userRole) => userRole.role.name === "ADMIN"
  );

  if (!isOwner && !isAdmin) {
    throw new AuthenticationError(
      "You dont have the permission to update this user",
      403
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: validatedData.data,
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
    message: "User updated successfully",
    data: { user: updatedUser },
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    throw new BadRequestError("Invalid user id");
  }

  const id = validatedId.data;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const loggedInUser = await prisma.user.findFirst({
    where: { id: req.userId },
    include: { roles: { include: { role: true } } },
  });

  const isOwner = user.id === loggedInUser?.id;
  const isAdmin = loggedInUser?.roles.some(
    (userRole) => userRole.role.name === "ADMIN"
  );

  if (!isOwner && !isAdmin) {
    throw new AuthenticationError(
      "You dont have the permission to delete this user",
      403
    );
  }

  await prisma.user.delete({
    where: { id },
  });

  if (isOwner) {
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
    throw new BadRequestError("Validation failed", validatedData.error.issues);
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
    throw new NotFoundError("Shipping Address not found");
  }

  await prisma.shippingAddress.delete({
    where: { userId: req.userId },
  });

  res.status(200).json({
    success: true,
    message: "Shipping Address Successfully deleted",
  });
};
