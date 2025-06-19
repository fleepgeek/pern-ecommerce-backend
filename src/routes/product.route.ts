import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addMediaToProduct,
} from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import upload from "../middlewares/upload.middleware";

const router = Router();

router.get("/", getProducts);
router.post("/", authenticate, createProduct);
router.post(
  "/:id/add-media",
  authenticate,
  upload.array("photos", 5),
  addMediaToProduct
);
router.get("/:id", getProductById);
router.put("/:id", authenticate, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

export default router;
