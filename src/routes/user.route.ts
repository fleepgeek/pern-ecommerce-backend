import { Router } from "express";
import { addShippingAddress } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/me/shipping-address", authenticate, addShippingAddress);

export default router;
