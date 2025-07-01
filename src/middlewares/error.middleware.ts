import { NextFunction, Request, Response } from "express";
import multer from "multer";

const errorHandler = (
  err: any,
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

  if (err instanceof NotFoundError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof BadRequestError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.details,
    });
    return;
  }

  if (err instanceof AuthenticationError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ConflictError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof AppError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Generic error handler
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    // this.name = this.constructor.name; // Set the error name to the class name
    // Ensure the prototype chain is correct
    // This is necessary for proper instanceof checks
    // and to avoid issues with class inheritance.
    // This line is crucial for TypeScript to recognize the class as an error.
    // It ensures that the prototype of this instance is AppError.
    // Without this, instanceof checks may not work as expected.
    // This is a workaround for a known issue with TypeScript and class inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends AppError {
  details?: any;
  constructor(message?: string, details?: any) {
    super((message = "Validation failed"), 400);
    if (this.details) this.details = details;
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class AuthenticationError extends AppError {
  statusCode: number;
  constructor(message = "Unauthorized", statusCode = 401) {
    super(message, statusCode);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
