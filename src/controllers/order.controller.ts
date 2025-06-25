import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../utils/db";
import { orderSchema } from "../utils/validations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const FRONTEND_URL = process.env.FRONTEND_URL as string;

export const createCheckoutSession = async (req: Request, res: Response) => {
  const validatedData = orderSchema.safeParse(req.body);
  if (!validatedData.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      error: validatedData.error.issues,
    });
    return;
  }

  const { cartItems } = validatedData.data;

  const user = await prisma.user.findFirst({
    where: { id: req.userId },
    include: { shippingAddress: true },
  });

  if (!user!.shippingAddress) {
    res
      .status(400)
      .json({ success: false, message: "Shipping Address is required" });
    return;
  }

  const produtIds = cartItems.map((items) => items.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: produtIds } },
  });

  if (products.length !== cartItems.length) {
    res
      .status(404)
      .json({ success: false, message: "One or more products not found" });
    return;
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
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/cart?canceled=true`,
  });

  if (!session.url) {
    res
      .status(500)
      .json({ success: false, message: "Error creating stripe sesssion" });
    return;
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

      if (order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: event.data.object.amount_total,
            paymentStatus: "PAID",
            status: "PAID",
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

      if (order.paymentStatus !== "FAILED") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "FAILED",
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
  res.send("Get all orders");
};

export const getCurrentUserOrders = async (req: Request, res: Response) => {
  // TODO: Implement get current user orders logic
  res.send("Get current user orders");
};

export const getOrderById = async (req: Request, res: Response) => {
  // TODO: Implement get order by ID logic
  res.send(`Get order with ID: ${req.params.id}`);
};

export const updateOrder = async (req: Request, res: Response) => {
  // TODO: Implement update order logic
  res.send(`Update order with ID: ${req.params.id}`);
};

export const deleteOrder = async (req: Request, res: Response) => {
  // TODO: Implement delete order logic
  res.send(`Delete order with ID: ${req.params.id}`);
};
