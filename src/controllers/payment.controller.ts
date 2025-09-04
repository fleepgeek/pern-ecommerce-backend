import { Request, Response } from "express";

import Stripe from "stripe";
import prisma from "../utils/db";
import { cartSchema } from "../utils/validations";
import { OrderStatus, PaymentStatus } from "../../generated/prisma";
import {
  AppError,
  BadRequestError,
  NotFoundError,
} from "../middlewares/error.middleware";
import {
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
} from "../utils/sendmail";

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
    data: { payment_url: session.url },
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
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            totalAmount: event.data.object.amount_total / 100, // converting it back to usd from cents
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PAID,
          },
          include: { user: true, cartItems: { include: { product: true } } },
        });
        await sendOrderConfirmationEmail(updatedOrder);
      }

      break;
    }
    case "payment_intent.payment_failed": {
      const orderId = event.data.object.metadata?.orderId;
      if (!orderId) break;

      const order = await prisma.order.findFirst({
        where: { id: orderId },
        include: { user: true },
      });
      if (!order) break;

      if (order.paymentStatus !== PaymentStatus.FAILED) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });

        await sendPaymentFailedEmail(
          order.user.email,
          order.user.name,
          order.id
        );
      }

      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
};
