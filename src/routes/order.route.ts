import { Router } from "express";
import {
  createCheckoutSession,
  deleteOrder,
  getCurrentUserOrders,
  getOrderById,
  getOrders,
  stripeWebHookHandler,
  updateOrder,
} from "../controllers/order.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getOrders); // TODO: Make only for admin access
router.post(
  "/checkout/create-checkout-session",
  authenticate,
  createCheckoutSession
);
router.post("/checkout/webhook", stripeWebHookHandler);
router.get("/me", authenticate, getCurrentUserOrders);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id", authenticate, updateOrder); // TODO: Make only for admin access
router.delete("/:id", authenticate, deleteOrder); // TODO: Make only for admin access

export default router;
