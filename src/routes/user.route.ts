import { Router } from "express";
import {
  setShippingAddress,
  deleteShippingAddress,
  deleteUser,
  getCurrentUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getUsers);
router.get("/me", authenticate, getCurrentUser);
router.post("/me/shipping-address", authenticate, setShippingAddress); // add or update the shipping address
router.delete("/me/shipping-address", authenticate, deleteShippingAddress);
router.get("/:id", authenticate, getUserById);
router.patch("/:id", authenticate, updateUser);
router.delete("/:id", authenticate, deleteUser);

export default router;
