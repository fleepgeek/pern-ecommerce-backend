import { Request, Response } from "express";
import prisma from "../utils/db";
import {
  idSchema,
  orderSchema,
  orderQuerySchema,
  currentUserOrderQuerySchema,
} from "../utils/validations";
import {
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";

export const getOrders = async (req: Request, res: Response) => {
  const validatedData = orderQuerySchema.safeParse(req.query);
  if (!validatedData.success) {
    throw new BadRequestError(
      "Invalid query parameters",
      validatedData.error.issues
    );
  }

  const {
    pageSize,
    page,
    sortBy,
    sortOrder,
    status,
    paymentStatus,
    searchQuery,
  } = validatedData.data;

  const filter: any = {};

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  // Search
  if (searchQuery) {
    filter.OR = [
      { user: { name: { contains: searchQuery } } },
      { user: { email: { contains: searchQuery } } },
    ];
  }

  const skip = pageSize ? (page - 1) * pageSize : 0;

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: filter,
        skip: skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          shippingAddress: {
            select: {
              address: true,
              state: true,
              country: true,
              postalCode: true,
            },
          },
          cartItems: {
            select: {
              id: true,
              orderId: true,
              productId: true,
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where: filter }),
    ]);

    if (!total) {
      res.status(404).json({
        success: false,
        message: "No orders found",
        data: {
          pagingInfo: {
            total: 0,
            page: 1,
            pages: 1,
          },
          orders: [],
        },
      });
      return;
    }

    const pages = pageSize ? Math.ceil(total / pageSize) : 1;

    res.status(200).json({
      success: true,
      message: "Orders successfully retrieved",
      data: {
        pagingInfo: { total, page, pages },
        orders,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

export const getCurrentUserOrders = async (req: Request, res: Response) => {
  const validatedData = currentUserOrderQuerySchema.safeParse(req.query);
  if (!validatedData.success) {
    throw new BadRequestError(
      "Invalid query parameters",
      validatedData.error.issues
    );
  }
  const { pageSize, cursor, status } = validatedData.data;

  const orders = await prisma.order.findMany({
    where: { userId: req.userId, status },
    take: pageSize + 1, // take extra 1 to know if theres a next item
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // skip the cursor
    }),
    // composite cursor ordering in case more than one orders have the same timestamp
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      shippingAddress: true,
      cartItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (orders.length === 0) {
    res.status(404).json({
      success: false,
      message: "No orders found",
      data: {
        cursorInfo: {
          nextCursor: null,
          pageSize,
        },
        orders: [],
      },
    });
    return;
  }

  let nextCursor: string | null = null;
  let paginatedOrders = orders;

  if (orders.length > pageSize) {
    // Set nextCursor to the last item of the current page (not the extra one)
    nextCursor = orders[pageSize - 1].id;
    paginatedOrders = orders.slice(0, pageSize); // Remove the extra order
  }

  res.status(200).json({
    success: true,
    message: "User orders successfully retrieved",
    data: {
      cursorInfo: { pageSize, nextCursor },
      orders: paginatedOrders,
    },
  });
};

export const getOrderById = async (req: Request, res: Response) => {
  const validatedData = idSchema.safeParse(req.params.id);
  if (!validatedData.success) {
    throw new BadRequestError("Invalid order ID format");
  }

  const order = await prisma.order.findFirst({
    where: { id: validatedData.data },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      shippingAddress: true,
      cartItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  res.status(200).json({
    success: true,
    message: "Order successfully retrieved",
    data: { order },
  });
};

export const updateOrder = async (req: Request, res: Response) => {
  const validatedId = idSchema.safeParse(req.params.id);
  if (!validatedId.success) {
    throw new BadRequestError("Invalid order ID format");
  }

  const validatedData = orderSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const id = validatedId.data;

  const order = await prisma.order.findFirst({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  // Only allow updating certain fields, e.g., status and paymentStatus
  // there wont be need for spreading(as seen below) if validatedData.data is passed directly
  // im just doing this here to show how we can remove falsy values when using object destructuring
  const { status, paymentStatus } = validatedData.data;

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  // if (status !== order.status) {
  //   // If the status is updated, send an email notification
  //   await sendOrderStatusUpdateEmail(
  //     updatedOrder.user.email,
  //     updatedOrder.user.name,
  //     updatedOrder.id,
  //     updatedOrder.status
  //   );
  // }

  res.status(200).json({
    success: true,
    message: "Order successfully updated",
    data: { order: updatedOrder },
  });
};

export const deleteOrder = async (req: Request, res: Response) => {
  const validatedData = idSchema.safeParse(req.params.id);
  if (!validatedData.success) {
    throw new BadRequestError("Invalid order ID format");
  }

  const order = await prisma.order.findFirst({
    where: { id: validatedData.data },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  await prisma.order.delete({
    where: { id: validatedData.data },
  });

  res.status(200).json({
    success: true,
    message: "Order successfully deleted",
  });
};
