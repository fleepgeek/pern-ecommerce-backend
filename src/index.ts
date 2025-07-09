import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.route";
import userRouter from "./routes/user.route";
import productRouter from "./routes/product.route";
import orderRouter from "./routes/order.route";
import { authenticate } from "./middlewares/auth.middleware";
import rateLimiter, { authLimiter } from "./middlewares/limiter.middleware";
import configureCloudinary from "./config/cloudinary";
import errorHandler from "./middlewares/error.middleware";
// import { stripeWebHookHandler } from "./controllers/order.controller";

dotenv.config();

configureCloudinary();

const PORT = process.env.PORT || 7000;
const app = express();

// app.use(cors({ credentials: true, origin: "http://localhost:5000" }));
app.use(cors());

// app.post(
//   "/v1/api/order/checkout/webhook",
//   express.raw({ type: "application/json" }),
//   stripeWebHookHandler
// );
app.use(
  "/v1/api/order/checkout/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(cookieParser());

app.use(rateLimiter);

app.get("/", (req: Request, res: Response) => {
  res.send({ success: true, message: "Welcome to PERN COMMERCE API" });
});

app.use("/v1/api/auth", authLimiter, authRouter);
app.use("/v1/api/user", authLimiter, userRouter);
app.use("/v1/api/product", productRouter);
app.use("/v1/api/order", orderRouter);

app.get("/v1/api/protected", authenticate, (req: Request, res: Response) => {
  res.send({ success: true, message: "Protected api" });
});

// Error Handling Middleware
// Express calls this when an error is passed to next(), because of the first 'err' argument
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
