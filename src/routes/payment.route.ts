import { Router } from "express";
import {
  createCheckoutSession,
  stripeWebHookHandler,
} from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/checkout/create-checkout-session",
  authenticate,
  createCheckoutSession
);
router.post("/checkout/webhook", stripeWebHookHandler);

export default router;
