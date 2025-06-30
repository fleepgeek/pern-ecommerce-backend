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
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { Role } from "../../generated/prisma";

const router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), getUsers);
router.get("/me", authenticate, getCurrentUser);
router.post("/me/shipping-address", authenticate, setShippingAddress); // add or update the shipping address
router.delete("/me/shipping-address", authenticate, deleteShippingAddress);
router.get("/:id", authenticate, getUserById);
router.patch("/:id", authenticate, updateUser);
router.delete("/:id", authenticate, deleteUser);

export default router;
