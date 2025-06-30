import { Request, Response } from "express";
import prisma from "../utils/db";
import { deleteImageFromCloud, uploadImageToCloud } from "../utils/handleImage";
import { mediaSchema } from "../utils/validations";
import { Prisma } from "../../generated/prisma";
import {
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";

export const addMediaToProduct = async (req: Request, res: Response) => {
  const validatedData = mediaSchema.safeParse(req.files);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const photos = validatedData.data;
  const { productId } = req.params;

  const product = await prisma.product.findFirst({
    where: { id: productId },
    include: { media: { select: { id: true } } },
  });
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const imageUrls = await Promise.all(
    photos.map((photo) => uploadImageToCloud(photo as Express.Multer.File))
  );

  const createdMedia = await prisma.media.createManyAndReturn({
    data: imageUrls.map(
      (imageUrl): Prisma.MediaCreateManyInput => ({
        url: imageUrl,
        uploadedById: req.userId,
        productId,
        isDefault:
          product.media.length === 0 && imageUrl === imageUrls[0]
            ? true
            : false,
      })
    ),
    select: {
      id: true,
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
};

export const deleteMediaFromProduct = async (req: Request, res: Response) => {
  const { productId, mediaId } = req.params;
  const media = await prisma.media.findFirst({
    where: { id: mediaId, productId },
    include: { product: { select: { media: true } } },
  });

  if (!media) {
    throw new NotFoundError("Media for product not found");
  }

  await prisma.media.delete({ where: { id: mediaId } });

  if (media.isDefault) {
    const anotherMedia = media.product?.media.find((m) => m.id !== mediaId);
    if (anotherMedia) {
      await prisma.media.update({
        where: { id: anotherMedia.id },
        data: { isDefault: true },
      });
    }
  }
  try {
    await deleteImageFromCloud(media.url);
  } catch (error: any) {
    console.error("Error deleting image from cloud:", error.message);
  }

  res.status(200).json({
    success: true,
    message: "Media deleted successfully",
  });
};

export const updateDefaultMediaForProduct = async (
  req: Request,
  res: Response
) => {
  const { productId, mediaId } = req.params;
  const result = await prisma.$transaction(async (tx) => {
    const media = await tx.media.findFirst({
      where: { id: mediaId, productId },
      include: { product: { select: { media: true } } },
    });

    if (!media) {
      throw new NotFoundError("Media for product not found");
    }

    await tx.media.updateMany({
      where: { productId },
      data: { isDefault: false },
    });

    const updatedMedia = await tx.media.update({
      where: { id: mediaId },
      data: { isDefault: true },
    });

    return updatedMedia;
  });

  res.status(200).json({
    success: true,
    message: "Product's Default Media Succcefuly Updated",
    data: { updatedMedia: result },
  });
};
