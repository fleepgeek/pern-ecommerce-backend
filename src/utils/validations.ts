import { z } from "zod";

export const idSchema = z.string().cuid();

export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must contain at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const emailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  currentPassword: z
    .string()
    .min(8, "Current password must be at least 8 characters long"),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const shippingAddressSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters long"),
  state: z.string().min(2, "City must be at least 2 characters long"),
  postalCode: z
    .string()
    .min(3, "Postal code must be at least 3 characters long"),
  country: z.string().min(2, "Country must be at least 2 characters long"),
});

export const productSchema = z.object({
  name: z
    .string({ message: "Product name is a required" })
    .min(2, "Product name must have at least 2 characters"),
  description: z.string({ required_error: "Product description is required" }),
  price: z.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }),
  isPublished: z.boolean().optional(),
  categoryId: z.string().optional(),
});

export const mediaSchema = z
  .array(
    z.object({
      fieldname: z.string(),
      originalname: z.string(),
      encoding: z.string(),
      mimetype: z.string(),
      buffer: z.instanceof(Buffer),
      size: z.number(),
    }),
    { required_error: "Photos are required" }
  )
  .min(1, "At least one image is required")
  .max(5, "You can't add more that 5 images");

export const cartSchema = z.object({
  cartItems: z
    .array(
      z.object({
        productId: z
          .string({ required_error: "Product Id is required" })
          .cuid("Invalid product id format")
          .min(10, "Product Id must contain at least 10 characters"),
        quantity: z
          .number({ required_error: "Product Quantity is required" })
          .min(1, "Quantity must be at least 1"),
      }),
      { required_error: "Products are required" }
    )
    .min(1, "At least one product is required"),
});

export const orderSchema = z
  .object(
    {
      status: z
        .enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"], {
          invalid_type_error: "Invalid order status",
        })
        .optional(),
      paymentStatus: z
        .enum(["PENDING", "PAID", "FAILED", "REFUNDED"], {
          invalid_type_error: "Invalid payment status",
        })
        .optional(),
    },
    { required_error: "Order status or payment status is required" }
  )
  .refine(
    (data) => data.status !== undefined || data.paymentStatus !== undefined,
    {
      message: "At least one of status or paymentStatus must be provided",
      path: [], // No specific path, applies to the whole object
      // path: ["status", "paymentStatus"],
    }
  );
