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
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), getOrders); // TODO: Make only for admin access
router.post(
  "/checkout/create-checkout-session",
  authenticate,
  createCheckoutSession
);
router.post("/checkout/webhook", stripeWebHookHandler);
router.get("/me", authenticate, getCurrentUserOrders);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id", authenticate, authorize(["ADMIN"]), updateOrder);
router.delete("/:id", authenticate, authorize(["ADMIN"]), deleteOrder);

export default router;
