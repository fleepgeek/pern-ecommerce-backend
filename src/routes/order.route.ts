import { Router } from "express";
import {
  deleteOrder,
  getCurrentUserOrders,
  getOrderById,
  getOrders,
  updateOrder,
} from "../controllers/order.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), getOrders);

router.get("/me", authenticate, getCurrentUserOrders);
router.get("/:id", authenticate, getOrderById);
router.patch("/:id", authenticate, authorize(["ADMIN"]), updateOrder);
router.delete("/:id", authenticate, authorize(["ADMIN"]), deleteOrder);

export default router;
