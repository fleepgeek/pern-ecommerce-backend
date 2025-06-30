import { Request, Response } from "express";
import prisma from "../utils/db";
import { idSchema, productSchema } from "../utils/validations";
import {
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";

export const createProduct = async (req: Request, res: Response) => {
  const validatedData = productSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { name, description, price, isPublished, categoryId } =
    validatedData.data;

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      isPublished,
      categoryId,
      userId: req.userId,
    },
  });

  res.status(200).json({
    success: true,
    message: "Product created successfully",
    data: { product },
  });
};

export const getProducts = async (req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: {
      media: {
        select: {
          id: true,
          url: true,
          isDefault: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Products fetched succefully",
    data: { products },
  });
};

export const getProductById = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    throw new BadRequestError("Invalid product ID format");
  }

  const id = validatedId.data;
  const product = await prisma.product.findFirst({
    where: { id },
    include: {
      media: {
        select: {
          id: true,
          url: true,
          isDefault: true,
        },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  res.status(200).json({
    success: true,
    message: "Product fetched succefully",
    data: { product },
  });
};

export const updateProduct = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    throw new BadRequestError("Invalid order ID format");
  }

  const validatedData = productSchema.partial().safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation error", validatedData.error.issues);
  }

  const id = validatedId.data;

  const product = await prisma.product.findFirst({ where: { id } });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: validatedData.data,
  });

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: { product: updatedProduct },
  });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    throw new BadRequestError("Invalid order ID format");
  }
  const id = validatedId.data;

  const product = await prisma.product.findFirst({ where: { id } });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  await prisma.product.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
};
