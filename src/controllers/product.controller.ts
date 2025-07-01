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
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * pageSize;

  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  const filters: any = {};

  filters.isPublished = true; // Default to published products for non-admin users

  if (req.query.category) filters.categoryId = req.query.category;
  if (req.query.minPrice) filters.price = { gte: Number(req.query.minPrice) };
  if (req.query.maxPrice) {
    filters.price = { ...filters.price, lte: Number(req.query.maxPrice) };
  }

  // Search
  if (req.query.searchQuery) {
    filters.OR = [
      { name: { contains: req.query.searchQuery as string } },
      { description: { contains: req.query.searchQuery as string } },
    ];
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: filters,
        skip: skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          media: {
            select: {
              id: true,
              url: true,
              isDefault: true,
            },
          },
        },
      }),
      prisma.product.count({ where: filters }),
    ]);

    if (!total) {
      res.status(404).json({
        success: false,
        message: "No products found",
        data: {
          pagingInfo: {
            total: 0,
            page: 1,
            pages: 1,
          },
          products: [],
        },
      });
      return;
    }

    const pages = Math.ceil(total / pageSize);

    res.status(200).json({
      success: true,
      message: "Products fetched succefully",
      data: {
        pagingInfo: { total, page, pages },
        products,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

export const getProductsForAdmin = async (req: Request, res: Response) => {
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * pageSize;

  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

  const filters: any = {};

  // Admin can view all products, published or not
  if (req.query.isPublished)
    filters.isPublished = req.query.isPublished === "true";
  if (req.query.category) filters.categoryId = req.query.category;
  if (req.query.minPrice) filters.price = { gte: Number(req.query.minPrice) };
  if (req.query.maxPrice) {
    filters.price = { ...filters.price, lte: Number(req.query.maxPrice) };
  }

  // Search
  if (req.query.searchQuery) {
    filters.OR = [
      { name: { contains: req.query.searchQuery as string } },
      { description: { contains: req.query.searchQuery as string } },
    ];
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: filters,
        skip: skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          media: {
            select: {
              id: true,
              url: true,
              isDefault: true,
            },
          },
        },
      }),
      prisma.product.count({ where: filters }),
    ]);

    if (!total) {
      res.status(404).json({
        success: false,
        message: "No products found",
        data: {
          pagingInfo: {
            total: 0,
            page: 1,
            pages: 1,
          },
          products: [],
        },
      });
      return;
    }

    const pages = Math.ceil(total / pageSize);

    res.status(200).json({
      success: true,
      message: "Products fetched succefully",
      data: {
        pagingInfo: { total, page, pages },
        products,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
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
