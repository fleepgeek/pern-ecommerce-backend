# PERN E-commerce Backend

This is the backend for a PERN stack e-commerce application. It provides RESTful APIs for managing products, users, orders, and authentication.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL & Prisma ORM (SQLite for development)
- JWT for authentication
- Zod for validation
- Cloudinary for Images
- Stripe for payments
- Nodemailer for emails

## Features

- **User Authentication & Authorization**

  - Register and login with JWT-based authentication via cookies
  - Role-based access (admin/user)
  - Verify Email
  - Change Password
  - Forgot password

- **User Profile**

  - Update profile information
  - View personal order history

- **Product Management**

  - CRUD operations for products (admin)
  - Product listing and search (public)

- **Order Management**

  - Place orders as authenticated users
  - View order history
  - Admin can view and manage all orders

- **Stripe Payment Integration**

  - Secure payment processing with Stripe
  - Webhook support for fulfilling orders

- **API Security**

  - Protected routes with JWT
  - Input validation with Zod and error handling
  - Rate limiting

- **Email Notifications**
  - Authentication related emails
  - Send order confirmation and status update emails to users

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the server: `npm run dev`

## TODOS

- Delete Media and images from Cloudinary for deleted products (CRON Job for bulk delete)
- Offload sending emails to background job
- Admin email notification for new orders
