import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth.route";
import { authenticate } from "./middlewares/auth.middleware";
import rateLimiter, { authLimiter } from "./middlewares/limiter.middleware";

dotenv.config();

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

app.get("/v1/api/protected", authenticate, (req: Request, res: Response) => {
  res.send({ success: true, message: "Protected api" });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
