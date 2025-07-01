import { Router } from "express";
import {
  getProducts,
  getProductsForAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import mediaRoutes from "./media.route";

const router = Router();

router.get("/", getProducts);
router.post("/", authenticate, authorize(["ADMIN"]), createProduct);
router.get("/admin", authenticate, authorize(["ADMIN"]), getProductsForAdmin);

router.get("/:id", getProductById);
router.patch("/:id", authenticate, authorize(["ADMIN"]), updateProduct);
router.delete("/:id", authenticate, authorize(["ADMIN"]), deleteProduct);

router.use("/:productId/media", authorize(["ADMIN"]), mediaRoutes);

export default router;
