import rateLimit from "express-rate-limit";

const rateLimiter = rateLimit({
  windowMs: 1000 * 60 * 5, // 5 minutes
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

export const authLimiter = rateLimit({
  windowMs: 1000 * 60 * 5, // 5 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

export default rateLimiter;
