import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import mediaRoutes from "./media.route";

const router = Router();

router.get("/", getProducts);
router.post("/", authenticate, createProduct); // TODO: Make only for admin access

router.get("/:id", getProductById);
router.patch("/:id", authenticate, updateProduct); // TODO: Make only for admin access
router.delete("/:id", authenticate, deleteProduct); // TODO: Make only for admin access

router.use("/:productId/media", mediaRoutes);

export default router;
