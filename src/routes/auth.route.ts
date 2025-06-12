import { Router } from "express";
import {
  login,
  signUp,
  logout,
  checkAuth,
  changePassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/sign-up", signUp);
router.post("/login", login);
router.post("/logout", logout);
router.post("/change-password", authenticate, changePassword);

router.get("/check-auth", authenticate, checkAuth);

export default router;
