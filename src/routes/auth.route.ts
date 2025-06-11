import { Router } from "express";
import {
  login,
  signUp,
  logout,
  checkAuth,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/sign-up", signUp);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check-auth", authenticate, checkAuth);

export default router;
