import { Router } from "express";
import {
  addMediaToProduct,
  deleteMediaFromProduct,
  updateDefaultMediaForProduct,
} from "../controllers/media.controller";
import { authenticate } from "../middlewares/auth.middleware";

import upload from "../middlewares/upload.middleware";

const router = Router();

router.post("/", authenticate, upload.array("photos", 5), addMediaToProduct);
router.delete("/:mediaId", authenticate, deleteMediaFromProduct);
router.patch("/:mediaId", authenticate, updateDefaultMediaForProduct);

export default router;
