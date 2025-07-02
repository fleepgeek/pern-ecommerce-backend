import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../utils/db";
import {
  idSchema,
  cartSchema,
  orderSchema,
  orderQuerySchema,
  currentUserOrderQuerySchema,
} from "../utils/validations";
import { OrderStatus, PaymentStatus } from "../../generated/prisma";
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";
import z3, { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const FRONTEND_URL = process.env.FRONTEND_URL as string;

export const createCheckoutSession = async (req: Request, res: Response) => {
  const validatedData = cartSchema.safeParse(req.body);
  if (!validatedData.success) {
    throw new BadRequestError("Validation failed", validatedData.error.issues);
  }

  const { cartItems } = validatedData.data;

  const user = await prisma.user.findFirst({
    where: { id: req.userId },
    include: { shippingAddress: true },
  });

  if (!user!.shippingAddress) {
    throw new BadRequestError("Shipping Address is required");
  }

  const produtIds = cartItems.map((items) => items.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: produtIds } },
  });

  if (products.length !== cartItems.length) {
    throw new NotFoundError("One or more products not found");
  }

  const order = await prisma.order.create({
    data: {
      userId: req.userId,
      cartItems: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
      shippingAddressId: user!.shippingAddress.id,
    },
    include: { cartItems: { include: { product: true } } },
  });

  const lineItems = cartItems.map((cartItem) => {
    const product = products.find(
      (product) => product.id === cartItem.productId
    );

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "usd",
        unit_amount: product!.price * 100, // convert to cents so it can become a number instead of float(needed because stripe needs an int)
        product_data: {
          name: product!.name,
        },
      },
      quantity: cartItem.quantity,
    };

    return lineItem;
  });

  const session = await stripe.checkout.sessions.create({
    customer_email: user?.email,
    line_items: lineItems,
    mode: "payment",
    metadata: {
      orderId: order.id,
    },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: 50 * 100, // in cents
            currency: "usd",
          },
        },
      },
    ],
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/cart?canceled=true`,
  });

  if (!session.url) {
    throw new AppError("Error creating Stripe payment sesssion");
  }

  res.status(201).json({
    success: true,
    message: "Checkout Session and Order successfully created",
    data: { url: session.url },
  });
};

export const stripeWebHookHandler = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  let event: Stripe.Event = req.body;

  // verify webhook came from stripe
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("Error constructing Stripe event:", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  // fulfill order
  switch (event.type) {
    case "checkout.session.completed": {
      const orderId = event.data.object.metadata?.orderId;
      if (!orderId) break;

      const order = await prisma.order.findFirst({
        where: { id: orderId },
      });
      if (!order) break;

      if (
        order.paymentStatus !== PaymentStatus.PAID &&
        event.data.object.amount_total
      ) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: event.data.object.amount_total / 100, // converting it back to usd from cents
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
          },
        });
      }

      break;
    }
    case "payment_intent.payment_failed": {
      const orderId = event.data.object.metadata?.orderId;
      if (!orderId) break;

      const order = await prisma.order.findFirst({
        where: { id: orderId },
      });
      if (!order) break;

      if (order.paymentStatus !== PaymentStatus.FAILED) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      }

      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
};

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

  const skip = (page - 1) * pageSize;

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

    const pages = Math.ceil(total / pageSize);

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
  const { pageSize, cursor } = validatedData.data;

  const orders = await prisma.order.findMany({
    where: { userId: req.userId },
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
  });

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
