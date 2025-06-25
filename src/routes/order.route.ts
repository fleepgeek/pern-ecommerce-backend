import { Router } from "express";
import {
  createCheckoutSession,
  deleteOrder,
  getCurrentUserOrders,
  getOrderById,
  getOrders,
  updateOrder,
} from "../controllers/order.controller";

const router = Router();

router.get("/", getOrders); // TODO: Make only for admin access
router.post("/create-checkout-session", createCheckoutSession);
router.get("/me", getCurrentUserOrders);
router.get("/:id", getOrderById);
router.patch("/:id", updateOrder); // TODO: Make only for admin access
router.delete("/:id", deleteOrder); // TODO: Make only for admin access

export default router;
