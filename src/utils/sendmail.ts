import { CartItem, Order, Product, User } from "../../generated/prisma";
import transporter from "../config/nodemailer";

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string,
  verifcationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`
) => {
  //   const canSendMail = await transporter.verify();
  //   console.log(canSendMail);
  try {
    const info = await transporter.sendMail({
      from: `"PERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "Verify your PERN ECOMMERCE account", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <p>Hello ${name}</p>
      <b>Click the following link to verify your email address: <a href="${verifcationURL}">Verify Email</a></b>
      <p>If you did not create an account, you can ignore this message.</p>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"PERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "Welcome to PERN ECOMMERCE", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <h1>Welcome to PERN ECOMMERCE</h1>
      <b>Hello ${name}, welcome to your new ecommerce exprience.</b>
      <b><a href="${process.env.FRONTEND_URL}">Visit site</a></b>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendPasswordChangedEmail = async (email: string, name: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"PERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[PERN ECOMMERCE] Your password has changed", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <b>Hello ${name}</b>
      <b>If you did not perform this action, you can recover access by entering ${email} into the reset password form at <a href="${process.env.FRONTEND_URL}/reset-password">PERN COMMERCE</a></b><br/>
      <b>Please do not reply to this email with your password. We will never ask for your password, and we strongly discourage you from sharing it with anyone.</b>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string,
  resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`
) => {
  try {
    const info = await transporter.sendMail({
      from: `"PERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[PERN ECOMMERCE] Reset your password", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <b>Hello ${name}</b><br/>
      <b>Reset your password by clicking <a href="${resetURL}">this link</a>.</b>
      <b>If you did not perform this action, you can ignore this message.</b><br/>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

type CartItemType = CartItem & {
  product: Product;
};

type OrderType = Order & {
  user: User;
  cartItems: CartItemType[];
};

export const sendOrderConfirmationEmail = async (
  // email: string, // User email
  // name: string, // User name
  // cartItems: CartItemType[], // Cart items with product details
  // orderId: string, // Order ID
  // totalAmount: number,
  order: OrderType // Order type from Prisma
) => {
  const orderStatusUrl = `${process.env.FRONTEND_URL}/order-status/${order.id}`;
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${order.user.email}`, // list of receivers
      subject: "[MERN ECOMMERCE] Order Confirmation", // Subject line
      html: `
      <b>Hello ${order.user.name}</b><br/>
      <p>Thank you for your order! Your order ID is <strong>${
        order.id
      }</strong>.</p>
      <p>You can track your <a href="${orderStatusUrl}">order status</a> on our website.</p>

      <p>Order Details:</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
        <th>Product</th>
        <th>Quantity</th>
        <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.cartItems
            .map(
              (item: any) => `
        <tr>
          <td>${item.product.name}</td>
          <td>${item.quantity}</td>
          <td>$${item.product.price}</td>
        </tr>
          `
            )
            .join("")} 
        </tbody>
      </table>

      <p>Total amount paid: <b>$${order.totalAmount}</b></p>
      `, // html body
    });
    // join() is needed to convert the array into a single string so the html can be valid(this is not reactjs)

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendOrderStatusUpdateEmail = async (
  email: string,
  name: string,
  orderId: string,
  orderStatus: string
) => {
  const orderStatusUrl = `${process.env.FRONTEND_URL}/order-status/${orderId}`;
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[MERN ECOMMERCE] Order Status Update", // Subject line
      html: `
      <b>Hello ${name}</b><br/>
      <p>Your order ID <strong>${orderId}</strong> has been updated to <strong>${orderStatus}</strong>.</p>
      <p>You can track your <a href="${orderStatusUrl}">order status</a> on our website.</p>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendPaymentFailedEmail = async (
  email: string,
  name: string,
  orderId: string
) => {
  const orderStatusUrl = `${process.env.FRONTEND_URL}/order-status/${orderId}`;
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[MERN ECOMMERCE] Order Payment Failed", // Subject line
      html: `
      <b>Hello ${name}</b><br/>
      <p>We're sorry, but your payment for order <strong>#${orderId}</strong> has failed.</p>
      <p>This could be due to insufficient funds, an expired card, or other issues with your payment method.</p>
      <p>Please <a href="${orderStatusUrl}">visit your order page</a> to retry the payment or update your billing information.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Thank you,<br/>MERN ECOMMERCE</p>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};
