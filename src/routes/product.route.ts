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
router.post("/", authenticate, createProduct);

router.get("/:id", getProductById);
router.patch("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

router.use("/:productId/media", mediaRoutes);

export default router;
