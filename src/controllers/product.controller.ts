import { Request, Response } from "express";
import prisma from "../utils/db";
import { productSchema } from "../utils/validations";

export const createProduct = async (req: Request, res: Response) => {
  const validatedData = productSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { name, description, price, isPublished, categoryId } =
    validatedData.data;

  try {
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
  } catch (error: any) {
    console.error("Error creating product");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error("Error getting products");
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product fetched succefully",
      data: { product },
    });
  } catch (error: any) {
    console.error("Error getting products");
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const validatedData = productSchema.partial().safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      error: validatedData.error.issues,
    });
    return;
  }

  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
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
  } catch (error: any) {
    console.error("Error updating product");
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    await prisma.product.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product");
    res.status(500).json({ success: false, message: error.message });
  }
};
