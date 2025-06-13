import { Router } from "express";
import {
  login,
  signUp,
  logout,
  checkAuth,
  changePassword,
  verifyEmail,
  resendVerifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Authentication core routes
router.post("/sign-up", signUp);
router.post("/login", login);
router.post("/logout", logout);

// Email verification routes
router.get("/verify-email/:verificationToken", verifyEmail);
router.post("/resend-verify-email", resendVerifyEmail);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:resetToken", resetPassword);

// Protected routes (requiring authentication)
router.get("/check-auth", authenticate, checkAuth);
router.post("/change-password", authenticate, changePassword);

export default router;
