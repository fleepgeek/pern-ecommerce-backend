import { Request, Response } from "express";
import prisma from "../utils/db";
import { addMediaSchema, productSchema } from "../utils/validations";
import { uploadImage } from "../utils/handleImage";
import { Prisma } from "../../generated/prisma";

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

  const { name, description, price, isPublished, categoryId } = req.body;

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

export const addMediaToProduct = async (req: Request, res: Response) => {
  const validatedData = addMediaSchema.safeParse(req.files);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      error: validatedData.error.issues,
    });
    return;
  }

  const photos = validatedData.data;
  const { id } = req.params;

  try {
    const product = await prisma.product.findFirst({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    const imageUrls = await Promise.all(
      photos.map((photo) => uploadImage(photo as Express.Multer.File))
    );

    const createdMedia = await prisma.media.createManyAndReturn({
      data: imageUrls.map(
        (imageUrl): Prisma.MediaCreateManyInput => ({
          url: imageUrl,
          uploadedById: req.userId,
          productId: id,
          isDefault: imageUrl === imageUrls[0] ? true : false,
        })
      ),
      select: {
        url: true,
        productId: true,
        isDefault: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Media successfully added to product",
      data: { media: createdMedia },
    });
  } catch (error: any) {
    console.error("Error adding media to product");
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
  // TODO: Implement product update logic
};

export const deleteProduct = async (req: Request, res: Response) => {
  // TODO: Implement product deletion logic
};
