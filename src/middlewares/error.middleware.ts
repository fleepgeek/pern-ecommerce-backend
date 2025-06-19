import { NextFunction, Request, Response } from "express";
import multer from "multer";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    console.log(err);
    res
      .status(400)
      .json({ success: false, message: `${err.code} - ${err.message}` });
    return;
  }

  // Generic error handler
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;
