import { Router } from "express";
import {
  addMediaToProduct,
  deleteMediaFromProduct,
  updateDefaultMediaForProduct,
} from "../controllers/media.controller";
import { authenticate } from "../middlewares/auth.middleware";

import upload from "../middlewares/upload.middleware";

const router = Router();

router.post(
  "/:productId/media",
  authenticate,
  upload.array("photos", 5),
  addMediaToProduct
);
router.delete(
  "/:productId/media/:mediaId",
  authenticate,
  deleteMediaFromProduct
);
router.patch(
  "/:productId/media/:mediaId",
  authenticate,
  updateDefaultMediaForProduct
);

export default router;
