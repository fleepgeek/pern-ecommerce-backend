import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import productRouter from "./routes/product.route";
import authRouter from "./routes/auth.route";
import { authenticate } from "./middlewares/auth.middleware";
import rateLimiter, { authLimiter } from "./middlewares/limiter.middleware";
import configureCloudinary from "./config/cloudinary";
import multer from "multer";

dotenv.config();

configureCloudinary();

const PORT = process.env.PORT || 3000;
const app = express();

// app.use(cors({ credentials: true, origin: "http://localhost:5000" }));
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(rateLimiter);

app.get("/", (req: Request, res: Response) => {
  res.send({ success: true, message: "Welcome to MERN COMMERCE API" });
});

app.use("/v1/api/auth", authLimiter, authRouter);
app.use("/v1/api/product", productRouter);

app.get("/v1/api/protected", authenticate, (req: Request, res: Response) => {
  res.send({ success: true, message: "Protected api" });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.log(err);
    res
      .status(400)
      .json({ success: false, message: `${err.code} - ${err.message}` });
    return;
  }
  // Other errors
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
