import { Request, Response } from "express";
import prisma from "../utils/db";
import { deleteImageFromCloud, uploadImageToCloud } from "../utils/handleImage";
import { mediaSchema } from "../utils/validations";
import { Prisma } from "../../generated/prisma";

export const addMediaToProduct = async (req: Request, res: Response) => {
  const validatedData = mediaSchema.safeParse(req.files);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      error: validatedData.error.issues,
    });
    return;
  }

  const photos = validatedData.data;
  const { productId } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: { id: productId },
      include: { media: { select: { id: true } } },
    });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
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
  } catch (error: any) {
    console.error("Error adding media to product");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const deleteMediaFromProduct = async (req: Request, res: Response) => {
  const { productId, mediaId } = req.params;
  try {
    const media = await prisma.media.findFirst({
      where: { id: mediaId, productId },
      include: { product: { select: { media: true } } },
    });

    if (!media) {
      res
        .status(404)
        .json({ success: false, message: "Media for product not found" });
      return;
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
      console.log("Error deleting image from cloud:", error.message);
    }

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting media from product");
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateDefaultMediaForProduct = async (
  req: Request,
  res: Response
) => {
  const { productId, mediaId } = req.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const media = await tx.media.findFirst({
        where: { id: mediaId, productId },
        include: { product: { select: { media: true } } },
      });

      if (!media) {
        // TODO: Create Custom Error class
        throw {
          status: 404,
          message: "Media for product not found",
        };
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
  } catch (error: any) {
    console.error("Error updating default media for product");
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
