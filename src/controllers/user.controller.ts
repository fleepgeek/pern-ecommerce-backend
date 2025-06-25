import { Request, Response } from "express";
import { shippingAddressSchema } from "../utils/validations";
import prisma from "../utils/db";

export const addShippingAddress = async (req: Request, res: Response) => {
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

  // const existingAddress = await prisma.shippingAddress.findFirst({
  //   where: { userId: req.userId },
  // });

  // if (existingAddress) {
  //   res.status(400).json({
  //     success: false,
  //     message: "Shipping Address already exists",
  //   });
  //   return;
  // }

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
