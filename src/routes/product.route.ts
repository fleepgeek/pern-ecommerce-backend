import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import mediaRoutes from "./media.route";
import { Role } from "../../generated/prisma";

const router = Router();

router.get("/", getProducts);
router.post("/", authenticate, authorize(["ADMIN"]), createProduct); // TODO: Make only for admin access

router.get("/:id", getProductById);
router.patch("/:id", authenticate, authorize(["ADMIN"]), updateProduct);
router.delete("/:id", authenticate, authorize(["ADMIN"]), deleteProduct);

router.use("/:productId/media", authorize(["ADMIN"]), mediaRoutes);

export default router;
